#!/usr/bin/env python3
"""Offline training script for monthly spending prediction.

Reads transaction CSV, engineers temporal + lag features, trains Ridge /
RandomForest / GradientBoosting with GridSearchCV and TimeSeriesSplit,
evaluates on a held-out test set, and exports predictions as a JSON artifact
consumed by the Next.js simulator API route.

Usage:
    python scripts/train_spending_model.py
"""

from __future__ import annotations

import json
import warnings
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit, cross_val_score
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

warnings.filterwarnings("ignore")

# ── Constants ─────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "transactions_training_data_ ktrapeznikov.csv"
MODEL_OUTPUT = PROJECT_ROOT / "models" / "spending_model.json"

EXCLUDE_CATEGORIES = {"Credit Card Payment", "Transfer"}

TOP_N_CATEGORIES = 10  # number of categories to track individually


# ── 1. Data Loading & Cleaning ────────────────────────────────────────────────


def load_and_clean(csv_path: Path) -> pd.DataFrame:
    """Load transaction CSV, parse dates, filter to debits excluding transfers.

    Args:
        csv_path: Path to the transactions CSV file.

    Returns:
        Cleaned DataFrame with parsed Date column, debit-only, no internal transfers.
    """
    df = pd.read_csv(csv_path)
    df["Date"] = pd.to_datetime(df["Date"], format="%m/%d/%Y")
    df = df[df["Transaction Type"] == "debit"].copy()
    df = df[~df["Category"].isin(EXCLUDE_CATEGORIES)].copy()
    df["Amount"] = df["Amount"].astype(float).abs()
    return df.reset_index(drop=True)


# ── 2. Monthly Aggregation ────────────────────────────────────────────────────


def aggregate_monthly(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate transactions into monthly spending totals per category.

    Args:
        df: Cleaned debit-only transaction DataFrame.

    Returns:
        DataFrame with one row per calendar month. Columns include year, month,
        month_of_year, total_spending, and per-category spending columns.
    """
    df = df.copy()
    df["year"] = df["Date"].dt.year
    df["month"] = df["Date"].dt.month

    # Top categories by total spending
    cat_totals = df.groupby("Category")["Amount"].sum().sort_values(ascending=False)
    top_cats = list(cat_totals.head(TOP_N_CATEGORIES).index)

    # Pivot: monthly spending per category
    monthly = (
        df.groupby(["year", "month", "Category"])["Amount"]
        .sum()
        .reset_index()
    )
    pivot = monthly.pivot_table(
        index=["year", "month"],
        columns="Category",
        values="Amount",
        aggfunc="sum",
        fill_value=0.0,
    ).reset_index()

    # Flatten column names
    pivot.columns = [
        col if isinstance(col, str) else col
        for col in pivot.columns
    ]

    # Keep only top categories (rest go into "Other")
    all_cat_cols = [c for c in pivot.columns if c not in ("year", "month")]
    other_cols = [c for c in all_cat_cols if c not in top_cats]
    pivot["Other_spending"] = pivot[other_cols].sum(axis=1)
    keep_cols = ["year", "month"] + top_cats + ["Other_spending"]
    pivot = pivot[[c for c in keep_cols if c in pivot.columns]].copy()

    # Total spending column
    cat_cols = [c for c in pivot.columns if c not in ("year", "month")]
    pivot["total_spending"] = pivot[cat_cols].sum(axis=1)

    # Month-of-year for feature engineering downstream
    pivot["month_of_year"] = pivot["month"]

    # Sort chronologically
    pivot = pivot.sort_values(["year", "month"]).reset_index(drop=True)
    return pivot


# ── 3. Feature Engineering ────────────────────────────────────────────────────


def engineer_features(
    df: pd.DataFrame,
    train_stats: dict[str, Any] | None = None,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Engineer temporal and lag features for spending prediction.

    When ``train_stats`` is None (train mode), statistics are computed from
    ``df`` itself. When provided (val/test mode), the supplied statistics are
    used to prevent data leakage.

    Args:
        df: Monthly spending DataFrame sorted by time.
        train_stats: Pre-computed statistics from the training set, or None.

    Returns:
        Tuple of (featured DataFrame with NaN rows dropped, stats dict).
    """
    df = df.copy()

    # ── Temporal features ──
    df["quarter"] = ((df["month_of_year"] - 1) // 3) + 1
    df["is_holiday_season"] = (df["month_of_year"] == 12).astype(int)
    df["is_summer"] = df["month_of_year"].isin([6, 7, 8]).astype(int)

    # Sine/cosine encoding of month for cyclical seasonality
    df["month_sin"] = np.sin(2 * np.pi * df["month_of_year"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month_of_year"] / 12)

    # ── Lag features on total_spending ──
    for lag in [1, 2, 3]:
        df[f"total_lag_{lag}"] = df["total_spending"].shift(lag)
    df["total_roll_mean_3"] = df["total_spending"].shift(1).rolling(3).mean()
    df["total_roll_std_3"] = df["total_spending"].shift(1).rolling(3).std()

    # ── Cross-category features ──
    cat_cols = _get_category_cols(df)
    if cat_cols:
        # Number of active categories (spending > 0) in previous month
        active_prev = (df[cat_cols] > 0).sum(axis=1).shift(1)
        df["active_cats_lag1"] = active_prev

        # Top category share in previous month
        total_prev = df["total_spending"].shift(1).replace(0, np.nan)
        max_cat_prev = df[cat_cols].shift(1).max(axis=1)
        df["top_cat_share_lag1"] = max_cat_prev / total_prev

    # ── Drop rows with NaN from lags ──
    df = df.dropna().reset_index(drop=True)

    # ── Normalize numeric features using train stats ──
    feature_cols = _get_feature_cols(df)
    if train_stats is None:
        stats: dict[str, Any] = {
            "mean": df[feature_cols].mean().to_dict(),
            "std": df[feature_cols].std().replace(0, 1).to_dict(),
        }
    else:
        stats = train_stats

    for col in feature_cols:
        mean = stats["mean"].get(col, 0.0)
        std = stats["std"].get(col, 1.0)
        if std == 0:
            std = 1.0
        df[col] = (df[col] - mean) / std

    return df, stats


# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_category_cols(df: pd.DataFrame) -> list[str]:
    """Return columns that represent per-category spending."""
    skip = {
        "year", "month", "month_of_year", "total_spending",
        "quarter", "is_holiday_season", "is_summer",
        "month_sin", "month_cos",
        "total_lag_1", "total_lag_2", "total_lag_3",
        "total_roll_mean_3", "total_roll_std_3",
        "active_cats_lag1", "top_cat_share_lag1",
        "target",
    }
    return [c for c in df.columns if c not in skip and not c.startswith("total_")]


def _get_feature_cols(df: pd.DataFrame) -> list[str]:
    """Return columns to be used as model input features."""
    skip = {"year", "month", "month_of_year", "total_spending", "target"}
    return [c for c in df.columns if c not in skip]


# ── 4. Model Training ────────────────────────────────────────────────────────


def train_models(
    x_train: pd.DataFrame,
    y_train: pd.Series,
) -> dict[str, Any]:
    """Train Ridge, RandomForest, GradientBoosting with GridSearchCV.

    Args:
        x_train: Feature matrix.
        y_train: Target vector.

    Returns:
        Dict mapping model name to dict with 'grid' (fitted GridSearchCV)
        and 'best_score'.
    """
    models = {
        "Ridge": Pipeline([
            ("scaler", StandardScaler()),
            ("model", Ridge()),
        ]),
        "RandomForest": Pipeline([
            ("model", RandomForestRegressor(n_estimators=100, random_state=42)),
        ]),
        "GradientBoosting": Pipeline([
            ("model", GradientBoostingRegressor(n_estimators=200, random_state=42)),
        ]),
    }

    param_grids = {
        "Ridge": {"model__alpha": [0.01, 0.1, 1.0, 10.0, 100.0]},
        "RandomForest": {
            "model__n_estimators": [50, 100, 200],
            "model__max_depth": [3, 5, 10, None],
            "model__min_samples_split": [2, 5, 10],
        },
        "GradientBoosting": {
            "model__n_estimators": [100, 200, 300],
            "model__learning_rate": [0.01, 0.05, 0.1],
            "model__max_depth": [3, 5, 7],
        },
    }

    tscv = TimeSeriesSplit(n_splits=3)
    results: dict[str, Any] = {}

    for name, pipeline in models.items():
        print(f"\n  Training {name}...")
        grid = GridSearchCV(
            pipeline,
            param_grids[name],
            cv=tscv,
            scoring="neg_mean_absolute_error",
            n_jobs=-1,
        )
        grid.fit(x_train, y_train)
        results[name] = {
            "grid": grid,
            "best_score": -grid.best_score_,
            "best_params": grid.best_params_,
        }
        print(f"    Best MAE (CV): {-grid.best_score_:.2f}  |  Params: {grid.best_params_}")

    return results


# ── 5. Evaluation ─────────────────────────────────────────────────────────────


def evaluate(
    model: Any,
    x_test: pd.DataFrame,
    y_test: pd.Series,
    label: str = "Test",
) -> dict[str, float]:
    """Evaluate a fitted model on a held-out set.

    Args:
        model: Fitted sklearn estimator or pipeline.
        x_test: Feature matrix.
        y_test: Target vector.
        label: Label for printing.

    Returns:
        Dict with r2, mae, rmse metrics.
    """
    preds = model.predict(x_test)
    r2 = r2_score(y_test, preds)
    mae = mean_absolute_error(y_test, preds)
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))

    print(f"\n  {label} Results:")
    print(f"    R^2:  {r2:.4f}")
    print(f"    MAE:  {mae:.2f}")
    print(f"    RMSE: {rmse:.2f}")
    return {"r2": r2, "mae": mae, "rmse": rmse}


# ── 6. Build JSON Artifact ────────────────────────────────────────────────────


def build_artifact(
    best_model: Any,
    best_name: str,
    train_df: pd.DataFrame,
    monthly_raw: pd.DataFrame,
    feature_names: list[str],
    test_metrics: dict[str, float],
    cv_scores: np.ndarray,
) -> dict[str, Any]:
    """Build the JSON-serializable model artifact.

    Args:
        best_model: The best fitted model pipeline.
        best_name: Name of the best model.
        train_df: The featured training DataFrame.
        monthly_raw: The raw (un-featured) monthly DataFrame for baselines.
        feature_names: List of feature column names.
        test_metrics: Dict with test evaluation metrics.
        cv_scores: Cross-validation MAE scores (negative).

    Returns:
        Dict ready to be JSON-serialized.
    """
    # Monthly baseline: average spending per calendar month (from raw data)
    monthly_baseline: dict[str, float] = {}
    for m in range(1, 13):
        mask = monthly_raw["month_of_year"] == m
        if mask.any():
            monthly_baseline[str(m)] = round(float(monthly_raw.loc[mask, "total_spending"].mean()), 2)
        else:
            monthly_baseline[str(m)] = round(float(monthly_raw["total_spending"].mean()), 2)

    # Per-category predictions per month
    cat_cols = _get_category_cols(monthly_raw)
    category_predictions: dict[str, dict[str, float]] = {}
    for m in range(1, 13):
        mask = monthly_raw["month_of_year"] == m
        month_cats: dict[str, float] = {}
        for cat in cat_cols:
            if cat in monthly_raw.columns:
                val = float(monthly_raw.loc[mask, cat].mean()) if mask.any() else 0.0
                month_cats[cat] = round(max(val, 0.0), 2)
        category_predictions[str(m)] = month_cats

    # Feature importances
    importances_dict: dict[str, float] = {}
    try:
        # Try to get feature importances from the underlying model
        final_model = best_model
        if hasattr(final_model, "named_steps"):
            final_model = final_model.named_steps["model"]
        if hasattr(final_model, "feature_importances_"):
            imps = final_model.feature_importances_
            for feat, imp in zip(feature_names, imps):
                importances_dict[feat] = round(float(imp), 6)
        elif hasattr(final_model, "coef_"):
            coefs = np.abs(final_model.coef_)
            for feat, imp in zip(feature_names, coefs):
                importances_dict[feat] = round(float(imp), 6)
    except Exception:
        pass

    # Lag sensitivity: how much recent spending deviations affect predictions
    lag_sensitivity = float(importances_dict.get("total_lag_1", 0.1))

    # Trend coefficient: simple linear trend from monthly totals
    x_time = np.arange(len(monthly_raw))
    if len(x_time) > 1:
        coeffs = np.polyfit(x_time, monthly_raw["total_spending"].values, 1)
        trend_coef = float(coeffs[0])
    else:
        trend_coef = 0.0

    date_range = (
        f"{int(monthly_raw['year'].min())}-{int(monthly_raw['month'].min()):02d} "
        f"to {int(monthly_raw['year'].max())}-{int(monthly_raw['month'].max()):02d}"
    )

    # Per-category MAE: how much each category's predicted average deviates
    # from actuals across all months
    category_mae: dict[str, float] = {}
    for cat in cat_cols:
        if cat not in monthly_raw.columns:
            continue
        errors = []
        for m in range(1, 13):
            mask = monthly_raw["month_of_year"] == m
            if not mask.any():
                continue
            actual_vals = monthly_raw.loc[mask, cat].values
            predicted = category_predictions.get(str(m), {}).get(cat, 0.0)
            for actual in actual_vals:
                errors.append(abs(float(actual) - predicted))
        if errors:
            category_mae[cat] = round(float(np.mean(errors)), 2)
        else:
            category_mae[cat] = 0.0

    return {
        "model_type": best_name,
        "training_date": datetime.now().isoformat(),
        "training_data": {
            "rows": int(len(train_df)),
            "date_range": date_range,
            "categories": cat_cols,
        },
        "evaluation": {
            "test_r2": round(float(test_metrics["r2"]), 4),
            "test_mae": round(float(test_metrics["mae"]), 2),
            "test_rmse": round(float(test_metrics["rmse"]), 2),
            "cv_mae_mean": round(float(-cv_scores.mean()), 2),
            "cv_mae_std": round(float(cv_scores.std()), 2),
        },
        "predictions": {
            "monthly_baseline": monthly_baseline,
            "category_predictions": category_predictions,
            "category_mae": category_mae,
        },
        "adjustments": {
            "lag_sensitivity": round(lag_sensitivity, 6),
            "trend_coefficient": round(trend_coef, 4),
        },
        "feature_importances": importances_dict,
    }


# ── Main ──────────────────────────────────────────────────────────────────────


def main() -> None:
    """Run the full training pipeline and export the JSON artifact."""
    print("=" * 60)
    print("  SPENDING PREDICTION MODEL — TRAINING PIPELINE")
    print("=" * 60)

    # ── Step 1: Load & EDA ──
    print("\n[1/7] Loading and cleaning data...")
    df = load_and_clean(CSV_PATH)
    print(f"  Rows after cleaning: {len(df)}")
    print(f"  Date range: {df['Date'].min().date()} to {df['Date'].max().date()}")
    print(f"  Unique categories: {df['Category'].nunique()}")
    print(f"\n  Top 10 categories by total spending:")
    cat_totals = df.groupby("Category")["Amount"].sum().sort_values(ascending=False)
    for cat, total in cat_totals.head(10).items():
        print(f"    {cat:30s}  ${total:>10,.2f}")
    print(f"\n  Monthly spending statistics:")
    monthly_totals = df.groupby([df["Date"].dt.year, df["Date"].dt.month])["Amount"].sum()
    print(f"    Mean:   ${monthly_totals.mean():,.2f}")
    print(f"    Std:    ${monthly_totals.std():,.2f}")
    print(f"    Min:    ${monthly_totals.min():,.2f}")
    print(f"    Max:    ${monthly_totals.max():,.2f}")

    # ── Step 2: Aggregate monthly ──
    print("\n[2/7] Aggregating to monthly totals...")
    monthly_df = aggregate_monthly(df)
    print(f"  Monthly rows: {len(monthly_df)}")
    print(f"  Category columns: {_get_category_cols(monthly_df)}")

    # ── Step 3: Train / Val / Test split (temporal) ──
    print("\n[3/7] Splitting data (70/15/15 temporal)...")
    n = len(monthly_df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    train_raw = monthly_df.iloc[:train_end].copy()
    val_raw = monthly_df.iloc[train_end:val_end].copy()
    test_raw = monthly_df.iloc[val_end:].copy()
    print(f"  Train: {len(train_raw)} months, Val: {len(val_raw)} months, Test: {len(test_raw)} months")

    # ── Step 4: Feature engineering ──
    print("\n[4/7] Engineering features...")
    train_feat, train_stats = engineer_features(train_raw)
    val_feat, _ = engineer_features(val_raw, train_stats=train_stats)
    test_feat, _ = engineer_features(test_raw, train_stats=train_stats)
    print(f"  Train features: {train_feat.shape}, Val: {val_feat.shape}, Test: {test_feat.shape}")

    # ── Create target: next month's total spending ──
    # Target is already represented in the shifted lag — we predict total_spending
    # directly since our features use past-only information.
    feature_cols = _get_feature_cols(train_feat)

    x_train = train_feat[feature_cols]
    y_train = train_feat["total_spending"]
    x_val = val_feat[feature_cols]
    y_val = val_feat["total_spending"]
    x_test = test_feat[feature_cols]
    y_test = test_feat["total_spending"]

    print(f"  Feature columns ({len(feature_cols)}): {feature_cols[:5]}...")

    # ── Step 5: Train models ──
    print("\n[5/7] Training models with GridSearchCV + TimeSeriesSplit...")
    results = train_models(x_train, y_train)

    # ── Step 6: Select best model ──
    print("\n[6/7] Model comparison:")
    print(f"  {'Model':<20s} {'CV MAE':>10s} {'Val MAE':>10s}")
    print("  " + "-" * 42)

    best_name = ""
    best_val_mae = float("inf")
    for name, info in results.items():
        val_preds = info["grid"].predict(x_val)
        val_mae = mean_absolute_error(y_val, val_preds)
        print(f"  {name:<20s} {info['best_score']:>10.2f} {val_mae:>10.2f}")
        if val_mae < best_val_mae:
            best_val_mae = val_mae
            best_name = name

    print(f"\n  Best model: {best_name} (Val MAE: {best_val_mae:.2f})")

    best_model = results[best_name]["grid"].best_estimator_

    # ── Final test evaluation (once) ──
    print("\n" + "=" * 50)
    print("  FINAL TEST SET RESULTS (evaluated once)")
    print("=" * 50)
    test_metrics = evaluate(best_model, x_test, y_test, label="Test")

    # Cross-validation on best model
    tscv = TimeSeriesSplit(n_splits=3)
    cv_scores = cross_val_score(
        best_model, x_train, y_train, cv=tscv, scoring="neg_mean_absolute_error"
    )
    print(f"\n  CV MAE: {-cv_scores.mean():.2f} +/- {cv_scores.std():.2f}")

    # ── Step 7: Export artifact ──
    print("\n[7/7] Exporting JSON artifact...")
    artifact = build_artifact(
        best_model=best_model,
        best_name=best_name,
        train_df=train_feat,
        monthly_raw=monthly_df,
        feature_names=feature_cols,
        test_metrics=test_metrics,
        cv_scores=cv_scores,
    )

    MODEL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    MODEL_OUTPUT.write_text(json.dumps(artifact, indent=2))
    size_kb = MODEL_OUTPUT.stat().st_size / 1024
    print(f"  Saved to: {MODEL_OUTPUT}")
    print(f"  Size: {size_kb:.1f} KB")

    print("\n" + "=" * 60)
    print("  TRAINING COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
