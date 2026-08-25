import { NextRequest, NextResponse } from "next/server";
import { listByTopic, corpusStats } from "@/lib/rag";

/**
 * Serves real NECTA past-paper questions from the static, pre-built
 * corpus (data/necta-corpus.json). No database — the corpus ships with
 * the app. Every entry cites its exact source PDF and year.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic") ?? undefined;
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);

  try {
    const questions = listByTopic(topic, year, limit);
    return NextResponse.json({
      ok: true,
      source: "official-necta",
      count: questions.length,
      questions,
      stats: corpusStats(),
    });
  } catch (error) {
    console.error("[mathtiba] NECTA question retrieval failed", error);
    return NextResponse.json(
      { ok: false, error: "NECTA content is temporarily unavailable." },
      { status: 503 }
    );
  }
}
