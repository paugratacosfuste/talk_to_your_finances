"""Tests for the offline spending prediction training script."""

import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# Ensure the scripts directory is importable
sys.path.insert(0, str(Path(__file__).resolve().parent))

from train_spending_model import (
    EXCLUDE_CATEGORIES,
    aggregate_monthly,
    engineer_features,
    load_and_clean,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "transactions_training_data_ ktrapeznikov.csv"
MODEL_PATH = PROJECT_ROOT / "models" / "spending_model.json"


# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def raw_df() -> pd.DataFrame:
    """Load the full CSV once for all tests in this module."""
    return load_and_clean(CSV_PATH)


@pytest.fixture(scope="module")
def monthly_df(raw_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate raw data to monthly totals per category."""
    return aggregate_monthly(raw_df)


# ── 1. CSV Loading & Date Parsing ─────────────────────────────────────────────


class TestLoadAndClean:
    def test_loads_non_empty(self, raw_df: pd.DataFrame) -> None:
        assert len(raw_df) > 0, "DataFrame should not be empty"

    def test_date_column_is_datetime(self, raw_df: pd.DataFrame) -> None:
        assert pd.api.types.is_datetime64_any_dtype(raw_df["Date"]), (
            "Date column should be parsed to datetime"
        )

    def test_date_range_reasonable(self, raw_df: pd.DataFrame) -> None:
        min_date = raw_df["Date"].min()
        max_date = raw_df["Date"].max()
        assert min_date.year >= 2015, "Data should start no earlier than 2015"
        assert max_date.year <= 2025, "Data should end no later than 2025"

    def test_debit_only(self, raw_df: pd.DataFrame) -> None:
        assert (raw_df["Transaction Type"] == "debit").all(), (
            "Only debit transactions should remain"
        )

    def test_excludes_internal_transfers(self, raw_df: pd.DataFrame) -> None:
        remaining_cats = set(raw_df["Category"].unique())
        for excluded in EXCLUDE_CATEGORIES:
            assert excluded not in remaining_cats, (
                f"Category '{excluded}' should be filtered out"
            )


# ── 2. Monthly Aggregation ────────────────────────────────────────────────────


class TestAggregateMonthly:
    def test_output_shape(self, monthly_df: pd.DataFrame) -> None:
        assert len(monthly_df) > 0, "Monthly df should not be empty"
        assert "year" in monthly_df.columns
        assert "month" in monthly_df.columns
        assert "total_spending" in monthly_df.columns

    def test_sorted_chronologically(self, monthly_df: pd.DataFrame) -> None:
        dates = monthly_df["year"] * 100 + monthly_df["month"]
        assert dates.is_monotonic_increasing, (
            "Monthly data must be sorted chronologically"
        )

    def test_no_negative_spending(self, monthly_df: pd.DataFrame) -> None:
        spending_cols = [
            c for c in monthly_df.columns
            if c not in ("year", "month", "month_of_year")
        ]
        for col in spending_cols:
            assert (monthly_df[col] >= 0).all(), (
                f"Spending column '{col}' should have no negatives"
            )

    def test_has_multiple_months(self, monthly_df: pd.DataFrame) -> None:
        assert len(monthly_df) >= 20, (
            "Should have at least 20 months of aggregated data"
        )


# ── 3. Feature Engineering ────────────────────────────────────────────────────


class TestFeatureEngineering:
    def test_returns_features_and_stats(self, monthly_df: pd.DataFrame) -> None:
        featured, stats = engineer_features(monthly_df)
        assert isinstance(featured, pd.DataFrame)
        assert isinstance(stats, dict)

    def test_temporal_features_created(self, monthly_df: pd.DataFrame) -> None:
        featured, _ = engineer_features(monthly_df)
        for col in ["quarter", "is_holiday_season", "is_summer"]:
            assert col in featured.columns, f"Missing temporal feature: {col}"

    def test_lag_features_created(self, monthly_df: pd.DataFrame) -> None:
        featured, _ = engineer_features(monthly_df)
        lag_cols = [c for c in featured.columns if "lag" in c.lower()]
        assert len(lag_cols) > 0, "Should create at least one lag feature"

    def test_no_nan_in_features(self, monthly_df: pd.DataFrame) -> None:
        featured, _ = engineer_features(monthly_df)
        assert not featured.isnull().any().any(), (
            "No NaN values should remain after feature engineering"
        )

    def test_leakage_prevention(self, monthly_df: pd.DataFrame) -> None:
        """Train stats should be reusable for val/test without leaking."""
        n = len(monthly_df)
        split = int(n * 0.7)
        train_part = monthly_df.iloc[:split].copy()
        test_part = monthly_df.iloc[split:].copy()

        _, train_stats = engineer_features(train_part)
        test_featured, _ = engineer_features(test_part, train_stats=train_stats)

        assert isinstance(test_featured, pd.DataFrame)
        assert len(test_featured) > 0


# ── 4. Temporal Split ─────────────────────────────────────────────────────────


class TestTemporalSplit:
    def test_chronological_order_preserved(
        self, monthly_df: pd.DataFrame
    ) -> None:
        n = len(monthly_df)
        train_end = int(n * 0.70)
        val_end = int(n * 0.85)

        train = monthly_df.iloc[:train_end]
        val = monthly_df.iloc[train_end:val_end]
        test = monthly_df.iloc[val_end:]

        train_max = train["year"].iloc[-1] * 100 + train["month"].iloc[-1]
        val_min = val["year"].iloc[0] * 100 + val["month"].iloc[0]
        val_max = val["year"].iloc[-1] * 100 + val["month"].iloc[-1]
        test_min = test["year"].iloc[0] * 100 + test["month"].iloc[0]

        assert train_max <= val_min, "Train data must not leak into validation"
        assert val_max <= test_min, "Validation data must not leak into test"


# ── 5. JSON Artifact Validation ───────────────────────────────────────────────


class TestJsonArtifact:
    """These tests run after the model has been trained and exported."""

    @pytest.fixture(autouse=True)
    def _skip_if_no_model(self) -> None:
        if not MODEL_PATH.exists():
            pytest.skip("Model artifact not yet generated")

    def test_valid_json(self) -> None:
        data = json.loads(MODEL_PATH.read_text())
        assert isinstance(data, dict)

    def test_required_keys(self) -> None:
        data = json.loads(MODEL_PATH.read_text())
        required = [
            "model_type",
            "training_date",
            "training_data",
            "evaluation",
            "predictions",
            "adjustments",
            "feature_importances",
        ]
        for key in required:
            assert key in data, f"Missing required key: {key}"

    def test_predictions_structure(self) -> None:
        data = json.loads(MODEL_PATH.read_text())
        preds = data["predictions"]
        assert "monthly_baseline" in preds
        assert "category_predictions" in preds
        assert len(preds["monthly_baseline"]) == 12, (
            "Should have prediction for each month (1-12)"
        )

    def test_predictions_non_negative(self) -> None:
        data = json.loads(MODEL_PATH.read_text())
        for month, val in data["predictions"]["monthly_baseline"].items():
            assert isinstance(val, (int, float)), (
                f"Prediction for month {month} should be a number"
            )
            assert val >= 0, (
                f"Prediction for month {month} should be non-negative"
            )

    def test_evaluation_metrics(self) -> None:
        data = json.loads(MODEL_PATH.read_text())
        ev = data["evaluation"]
        assert "test_mae" in ev
        assert "test_rmse" in ev
        assert isinstance(ev["test_mae"], (int, float))
        assert ev["test_mae"] >= 0

    def test_artifact_size(self) -> None:
        size_kb = MODEL_PATH.stat().st_size / 1024
        assert size_kb < 100, f"Artifact is {size_kb:.1f} KB, must be under 100 KB"
