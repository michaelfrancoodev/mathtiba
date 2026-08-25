import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/rag";

/**
 * GENERATIVE LAYER ONLY. This route answers a student's free-text
 * question using ONLY the real NECTA source chunks retrieved by
 * searchKnowledge() — it is explicitly instructed never to invent a
 * question, answer, mark, year, or method, and never to replace the
 * deterministic verification used elsewhere in the app (app/api/verify,
 * app/api/check-answer). If no AI key is configured, or nothing relevant
 * is retrieved, it returns the retrieved sources with no AI-generated
 * text rather than guessing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const topic =
      typeof body.topic === "string" && body.topic.trim() ? body.topic.trim() : undefined;
    const locale = body.locale === "sw" ? "sw" : "en";

    if (!question || question.length > 1000) {
      return NextResponse.json(
        { ok: false, error: "question must be between 1 and 1000 characters" },
        { status: 400 }
      );
    }

    const sources = await searchKnowledge(question, topic, 6);
    if (!sources.length) {
      return NextResponse.json({
        ok: true,
        answer:
          locale === "sw"
            ? "Hakuna chanzo cha NECTA kilichopatikana kwa swali hili bado."
            : "No verified NECTA source was found for this question yet.",
        sources: [],
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // No key: return the real retrieved sources without AI phrasing —
      // still useful, still fully honest about what generated what.
      return NextResponse.json({
        ok: true,
        answer:
          locale === "sw"
            ? "Vyanzo vifuatavyo vya NECTA vinahusiana na swali lako."
            : "The following NECTA sources are related to your question.",
        sources: sources.map((s) => ({
          id: s.id,
          title: s.sourceTitle,
          url: s.sourceUrl,
          year: s.sourceYear,
          topic: s.topic,
          similarity: s.similarity,
        })),
      });
    }

    const context = sources
      .map(
        (s, i) =>
          `[Source ${i + 1}] ${s.sourceTitle} (${s.sourceYear ?? "n.d."})\n${s.content}${
            s.answer ? `\nAnswer: ${s.answer}` : ""
          }`
      )
      .join("\n\n");
    const language = locale === "sw" ? "Kiswahili" : "English";

    let answerText = "";
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: `You are a careful Tanzanian mathematics learning assistant. Answer in ${language}. Use only the verified source context supplied below. Do not invent a NECTA question, answer, mark, year, or marking rule. If the sources do not support a claim, say so plainly. Explain the method step by step. Never claim to verify a calculation yourself — you are explaining, not computing.`,
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: `Student question:\n${question}\n\nVerified context:\n${context}` }],
              },
            ],
            generationConfig: { maxOutputTokens: 500 },
          }),
          signal: AbortSignal.timeout(8000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        answerText =
          data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      }
    } catch {
      answerText = "";
    }

    if (!answerText.trim()) {
      return NextResponse.json({
        ok: true,
        answer:
          locale === "sw"
            ? "Vyanzo vifuatavyo vya NECTA vinahusiana na swali lako."
            : "The following NECTA sources are related to your question.",
        sources: sources.map((s) => ({
          id: s.id,
          title: s.sourceTitle,
          url: s.sourceUrl,
          year: s.sourceYear,
          topic: s.topic,
          similarity: s.similarity,
        })),
      });
    }

    return NextResponse.json({
      ok: true,
      answer: answerText.trim(),
      sources: sources.map((s) => ({
        id: s.id,
        title: s.sourceTitle,
        url: s.sourceUrl,
        year: s.sourceYear,
        topic: s.topic,
        similarity: s.similarity,
      })),
    });
  } catch (error) {
    console.error("[mathtiba] RAG answer failed", error);
    return NextResponse.json({ ok: false, error: "RAG tutor unavailable" }, { status: 503 });
  }
}
