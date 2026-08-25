import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const topic =
      typeof body.topic === "string" && body.topic.trim() ? body.topic.trim() : undefined;

    if (!query || query.length > 1000) {
      return NextResponse.json(
        { ok: false, error: "query must be between 1 and 1000 characters" },
        { status: 400 }
      );
    }

    const results = await searchKnowledge(query, topic);
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error("[mathtiba] RAG search failed", error);
    return NextResponse.json({ ok: false, error: "RAG search unavailable" }, { status: 503 });
  }
}
