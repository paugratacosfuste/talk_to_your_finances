// Cosine similarity RAG retrieval using precomputed embeddings.
// Runs entirely in the browser - no backend needed.

interface Chunk {
  id: string;
  topic: string;
  text: string;
  tags: string[];
}

interface EmbeddingEntry {
  id: string;
  topic: string;
  embedding: number[];
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function loadEmbeddings(): Promise<EmbeddingEntry[]> {
  const res = await fetch("/finance_embeddings.json");
  return res.json();
}

export async function loadChunks(): Promise<Chunk[]> {
  const res = await fetch("/finance_knowledge_base.json");
  return res.json();
}

function buildQueryVector(query: string, embeddingDim: number): number[] {
  const tokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  const vec = new Array(embeddingDim).fill(0);
  tokens.forEach((token) => {
    for (let i = 0; i < token.length; i++) {
      vec[token.charCodeAt(i) % embeddingDim] += 1;
    }
  });
  const norm = Math.sqrt(vec.reduce((s: number, v: number) => s + v * v, 0)) || 1;
  return vec.map((v: number) => v / norm);
}

export function retrieveRelevantChunks(
  userProfile: string,
  embeddings: EmbeddingEntry[],
  chunks: Chunk[],
  topK = 4
): Chunk[] {
  const chunkMap = Object.fromEntries(chunks.map((c) => [c.id, c]));
  const queryTokens = new Set(
    userProfile.toLowerCase().split(/\W+/).filter(Boolean)
  );
  const embeddingDim = embeddings[0]?.embedding.length ?? 384;
  const queryVec = buildQueryVector(userProfile, embeddingDim);

  const scored = embeddings.map((e) => {
    const chunk = chunkMap[e.id];
    if (!chunk) return { id: e.id, score: 0 };

    // Keyword overlap score
    const chunkWords = new Set([
      ...chunk.tags,
      ...chunk.topic.split("_"),
    ]);
    const overlap = [...chunkWords].filter((w) => queryTokens.has(w)).length;

    // Dot-product similarity against precomputed embedding
    const dotScore = cosineSim(queryVec, e.embedding);

    return { id: e.id, score: overlap * 0.6 + dotScore * 0.4 };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, topK)
    .map((s) => chunkMap[s.id])
    .filter(Boolean);
}
