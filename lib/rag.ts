import corpusData from "@/data/necta-corpus.json";

/**
 * Zero-infrastructure knowledge retrieval over a static, pre-built corpus
 * of real NECTA past-paper questions (data/necta-corpus.json). No database,
 * no external service is required to run this — the corpus ships with the
 * app and is loaded at module init.
 *
 * If GEMINI_API_KEY is configured AND a corpus entry has a precomputed
 * embedding (added at ingestion time, not at request time — see
 * scripts/ingest-necta.ts), search ranks by cosine similarity. Otherwise
 * it gracefully falls back to a deterministic keyword-overlap score, so
 * retrieval always works, with or without an AI key.
 */

export interface KnowledgeChunk {
  id: string;
  sourceType: "official-necta" | "teacher-verified" | "generated";
  sourceUrl: string;
  sourceTitle: string;
  sourceYear?: number;
  topic: string;
  subtopic?: string;
  content: string;
  answer?: string;
  workingNote?: string;
  embedding?: number[];
}

export interface KnowledgeResult extends KnowledgeChunk {
  similarity: number;
  method: "embedding" | "keyword";
}

const CORPUS = corpusData as KnowledgeChunk[];

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "of", "to", "in", "and", "find", "what",
  "was", "for", "on", "at", "by", "with", "if", "his", "her", "its",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/** Deterministic keyword-overlap score (Jaccard-style over token sets). No AI required. */
function keywordScore(query: string, content: string): number {
  const q = new Set(tokenize(query));
  const c = new Set(tokenize(content));
  if (q.size === 0 || c.size === 0) return 0;
  let overlap = 0;
  for (const w of q) if (c.has(w)) overlap++;
  return overlap / Math.sqrt(q.size * c.size);
}

/** Calls the Gemini embedding API directly (no SDK). Returns null on any failure. */
export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const values = data?.embedding?.values;
    return Array.isArray(values) ? values : null;
  } catch {
    return null;
  }
}

export async function searchKnowledge(
  query: string,
  topic?: string,
  limit = 6
): Promise<KnowledgeResult[]> {
  const pool = topic ? CORPUS.filter((c) => c.topic === topic) : CORPUS;
  if (pool.length === 0) return [];

  const hasEmbeddings = pool.some((c) => Array.isArray(c.embedding) && c.embedding.length > 0);
  const queryEmbedding = hasEmbeddings ? await embedText(query) : null;

  const scored: KnowledgeResult[] = pool.map((chunk) => {
    if (queryEmbedding && chunk.embedding && chunk.embedding.length === queryEmbedding.length) {
      return {
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
        method: "embedding" as const,
      };
    }
    return {
      ...chunk,
      similarity: keywordScore(query, `${chunk.content} ${chunk.topic}`),
      method: "keyword" as const,
    };
  });

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.min(Math.max(limit, 1), 12));
}

export function listByTopic(topic?: string, year?: number, limit = 20): KnowledgeChunk[] {
  let pool = CORPUS;
  if (topic) pool = pool.filter((c) => c.topic === topic);
  if (year) pool = pool.filter((c) => c.sourceYear === year);
  return pool
    .slice()
    .sort((a, b) => (b.sourceYear ?? 0) - (a.sourceYear ?? 0))
    .slice(0, Math.min(Math.max(limit, 1), 100));
}

export function corpusStats() {
  const byTopic: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  for (const c of CORPUS) {
    byTopic[c.topic] = (byTopic[c.topic] ?? 0) + 1;
    if (c.sourceYear) byYear[c.sourceYear] = (byYear[c.sourceYear] ?? 0) + 1;
  }
  return { total: CORPUS.length, byTopic, byYear };
}
