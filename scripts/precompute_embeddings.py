#!/usr/bin/env python3
"""Embeds all chunks in finance_knowledge_base.json using sentence-transformers
and saves precomputed embeddings to public/finance_embeddings.json.

Run once after editing the knowledge base.

Usage:
    python scripts/precompute_embeddings.py
"""

from __future__ import annotations

import json
from pathlib import Path

from sentence_transformers import SentenceTransformer

PROJECT_ROOT = Path(__file__).resolve().parent.parent
KB_PATH = PROJECT_ROOT / "src" / "data" / "finance_knowledge_base.json"
OUTPUT_PATH = PROJECT_ROOT / "public" / "finance_embeddings.json"


def main() -> None:
    """Embed knowledge base chunks and save to JSON."""
    print("=" * 60)
    print("  PRECOMPUTE EMBEDDINGS")
    print("=" * 60)

    print("\n[1/3] Loading knowledge base...")
    with open(KB_PATH) as f:
        chunks = json.load(f)
    print(f"  Chunks: {len(chunks)}")

    print("\n[2/3] Loading model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    texts = [c["text"] for c in chunks]
    print(f"  Encoding {len(texts)} texts...")
    embeddings = model.encode(texts).tolist()

    print("\n[3/3] Saving embeddings...")
    output = [
        {"id": c["id"], "topic": c["topic"], "embedding": emb}
        for c, emb in zip(chunks, embeddings)
    ]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f)

    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(f"  Output: {OUTPUT_PATH}")
    print(f"  Size: {size_kb:.1f} KB")
    print(f"\n  Embedded {len(output)} chunks")
    print("\n" + "=" * 60)
    print("  EMBEDDING COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
