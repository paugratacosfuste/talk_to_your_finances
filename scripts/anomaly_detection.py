#!/usr/bin/env python3
"""Trains an IsolationForest on transaction history and outputs anomaly scores
per transaction to public/anomaly_scores.json.

Usage:
    python scripts/anomaly_detection.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "transactions_training_data_ ktrapeznikov.csv"
OUTPUT_PATH = PROJECT_ROOT / "public" / "anomaly_scores.json"

EXCLUDE_CATEGORIES = {"Credit Card Payment", "Transfer"}


def main() -> None:
    """Run anomaly detection pipeline."""
    print("=" * 60)
    print("  ANOMALY DETECTION PIPELINE")
    print("=" * 60)

    # Load data
    print("\n[1/4] Loading data...")
    df = pd.read_csv(CSV_PATH)
    df["Date"] = pd.to_datetime(df["Date"], format="%m/%d/%Y")
    df = df[df["Transaction Type"] == "debit"].copy()
    df = df[~df["Category"].isin(EXCLUDE_CATEGORIES)].copy()
    df["Amount"] = df["Amount"].astype(float).abs()
    print(f"  Transactions: {len(df)}")

    # Feature engineering
    print("\n[2/4] Engineering features...")
    df["day_of_week"] = df["Date"].dt.dayofweek

    le = LabelEncoder()
    df["category_encoded"] = le.fit_transform(df["Category"])

    features = df[["Amount", "day_of_week", "category_encoded"]].values

    # Train IsolationForest
    print("\n[3/4] Training IsolationForest...")
    model = IsolationForest(contamination=0.05, random_state=42)
    df["anomaly_label"] = model.fit_predict(features)
    df["anomaly_score"] = model.decision_function(features)

    # Compute per-category monthly averages for reason generation
    df["year_month"] = df["Date"].dt.to_period("M")
    n_months = df["year_month"].nunique()
    cat_monthly_avg = (
        df.groupby("Category")["Amount"].sum() / n_months
    ).to_dict()

    # Build output
    print("\n[4/4] Building output...")
    result: dict[str, dict] = {}
    anomaly_count = 0

    for _, row in df.iterrows():
        is_anomaly = row["anomaly_label"] == -1
        reason = None

        if is_anomaly:
            anomaly_count += 1
            cat = row["Category"]
            avg = cat_monthly_avg.get(cat, 1.0)
            if avg > 0:
                ratio = round(row["Amount"] / avg, 1)
                reason = (
                    f"This {cat.lower()} spend is {ratio}x your monthly "
                    f"average for this category"
                )
            else:
                reason = f"Unusual {cat.lower()} transaction detected"

        # Use a deterministic ID matching the frontend mock data format
        idx = int(row.name) + 1
        tx_id = f"txn_{idx:04d}"

        result[tx_id] = {
            "is_anomaly": bool(is_anomaly),
            "score": round(float(row["anomaly_score"]), 4),
            "reason": reason,
        }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, indent=2))

    print(f"\n  Total transactions: {len(result)}")
    print(f"  Anomalies detected: {anomaly_count}")
    print(f"  Output: {OUTPUT_PATH}")
    print("\n" + "=" * 60)
    print("  ANOMALY DETECTION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
