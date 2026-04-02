#!/usr/bin/env python3
"""Runs k-means clustering on monthly category spend vectors to assign
the user a behavioural persona. Outputs public/persona.json.

Usage:
    python scripts/persona_clustering.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "transactions_training_data_ ktrapeznikov.csv"
OUTPUT_PATH = PROJECT_ROOT / "public" / "persona.json"

EXCLUDE_CATEGORIES = {"Credit Card Payment", "Transfer"}

PERSONAS = [
    {
        "label": "The Weekend Spender",
        "description": (
            "High entertainment and dining on weekends with lower weekday spend "
            "- typical of social spenders who keep weekday costs controlled but "
            "loosen up on weekends."
        ),
        "signal_categories": {"Entertainment", "Restaurants"},
    },
    {
        "label": "The Subscription Hoarder",
        "description": (
            "Disproportionate recurring and subscription spend relative to "
            "income - the type who signs up for every service and forgets to "
            "cancel, bleeding money on autopilot."
        ),
        "signal_categories": {"Subscriptions", "Utilities"},
    },
    {
        "label": "The Grocery Optimizer",
        "description": (
            "High food-at-home spending, low dining out, and a solid savings "
            "rate - someone who plans meals, clips coupons, and treats the "
            "kitchen as the default option."
        ),
        "signal_categories": {"Groceries"},
    },
    {
        "label": "The Lifestyle Inflater",
        "description": (
            "Spending grows with income, savings delta stays flat - earns "
            "more but always finds ways to spend more too, upgrading habits "
            "instead of building a cushion."
        ),
        "signal_categories": {"Shopping", "Health", "Transport"},
    },
]


def main() -> None:
    """Run persona clustering pipeline."""
    print("=" * 60)
    print("  SPENDING PERSONA CLUSTERING")
    print("=" * 60)

    # Load data
    print("\n[1/4] Loading data...")
    df = pd.read_csv(CSV_PATH)
    df["Date"] = pd.to_datetime(df["Date"], format="%m/%d/%Y")
    df = df[df["Transaction Type"] == "debit"].copy()
    df = df[~df["Category"].isin(EXCLUDE_CATEGORIES)].copy()
    df["Amount"] = df["Amount"].astype(float).abs()
    df["year_month"] = df["Date"].dt.to_period("M")
    print(f"  Transactions: {len(df)}")

    # Build monthly spend matrix
    print("\n[2/4] Building monthly spend matrix...")
    pivot = df.pivot_table(
        index="year_month",
        columns="Category",
        values="Amount",
        aggfunc="sum",
        fill_value=0.0,
    )
    print(f"  Shape: {pivot.shape} (months x categories)")

    # Normalize
    scaler = StandardScaler()
    scaled = scaler.fit_transform(pivot.values)

    # Run KMeans
    print("\n[3/4] Running KMeans (k=4)...")
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    labels = kmeans.fit_predict(scaled)
    print(f"  Cluster distribution: {np.bincount(labels).tolist()}")

    # Assign most frequent cluster as user persona
    most_common = int(np.bincount(labels).argmax())

    # Compute cluster profile vs overall to match persona by feature similarity
    cluster_mask = labels == most_common
    cluster_means = pivot.values[cluster_mask].mean(axis=0)
    overall_means = pivot.values.mean(axis=0)

    # Score each persona by how elevated its signal categories are in this cluster
    categories = list(pivot.columns)
    best_score = -1.0
    best_persona_idx = 0
    for pi, p in enumerate(PERSONAS):
        signal_cats = p["signal_categories"]
        score = 0.0
        for i, cat in enumerate(categories):
            if cat in signal_cats and overall_means[i] > 0:
                score += cluster_means[i] / overall_means[i]
        if score > best_score:
            best_score = score
            best_persona_idx = pi

    persona = PERSONAS[best_persona_idx]

    categories = list(pivot.columns)
    feature_tuples: list[tuple[float, str]] = []
    for i, cat in enumerate(categories):
        if overall_means[i] > 0:
            ratio = cluster_means[i] / overall_means[i]
            if abs(ratio - 1.0) > 0.1:
                direction = "above" if ratio > 1.0 else "below"
                feature_tuples.append(
                    (abs(ratio - 1.0), f"{cat} {ratio:.1f}x {direction} average")
                )

    # Sort by deviation magnitude and take top 3
    feature_tuples.sort(key=lambda t: t[0], reverse=True)
    top_features = [t[1] for t in feature_tuples[:3]] if feature_tuples else [
        "Balanced spending across categories"
    ]

    # Build output
    print("\n[4/4] Writing output...")
    result = {
        "label": persona["label"],
        "description": persona["description"],
        "top_features": top_features,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, indent=2))

    print(f"\n  Assigned persona: {persona['label']}")
    print(f"  Top features: {top_features}")
    print(f"  Output: {OUTPUT_PATH}")
    print("\n" + "=" * 60)
    print("  PERSONA CLUSTERING COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
