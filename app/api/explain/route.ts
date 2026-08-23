import { NextRequest, NextResponse } from "next/server";

/**
 * GENERATIVE LAYER ONLY. This route never decides whether an answer is
 * correct and never computes a mathematical result — it only turns
 * already-computed, already-verified structured facts into a short
 * natural-language narrative for the student/teacher report.
 *
 * If ANTHROPIC_API_KEY is not set, or the call fails for any reason,
 * this route falls back to a deterministic, data-driven template so the
 * app is fully functional and the report page never breaks or blocks
 * on an external service.
 */

interface ExplainRequest {
  locale: "en" | "sw";
  skill: string;
  skillLabel: string;
  misconceptionId: string;
  misconceptionQuote: string;
  chainLabels: string[];
  before: number;
  after: number;
  actionScore: string;
  reasonScore: string;
  resolved: boolean;
}

function fallbackNarrative(body: ExplainRequest): string {
  const { locale, skillLabel, chainLabels, before, after, actionScore, reasonScore, resolved } = body;

  if (locale === "sw") {
    const chain = chainLabels.length > 1 ? chainLabels.join(" → ") : skillLabel;
    return (
      `Mwanafunzi alionyesha udhaifu katika ${skillLabel} (kabla: ${before}%). ` +
      `Chanzo halisi kilifuatiliwa kupitia mnyororo: ${chain}. ` +
      `Wakati wa mazoezi, hatua za utekelezaji zilikuwa sahihi ${actionScore}, lakini sababu ` +
      `zilizoelezwa zilikuwa dhabiti ${reasonScore} pekee — ikionyesha kwamba baadhi ya majibu ` +
      `sahihi yalitokana na kanuni iliyokaririwa, siyo uelewa wa kina. ` +
      `Baada ya zoezi na kupimwa upya kwa muundo tofauti, hali ni: ${
        resolved ? `imeondoka (alama sasa ${after}%)` : "bado inahitaji zoezi zaidi"
      }.`
    );
  }

  const chain = chainLabels.length > 1 ? chainLabels.join(" → ") : skillLabel;
  return (
    `The student showed weakness in ${skillLabel} (before: ${before}%). ` +
    `The root cause was traced through the chain: ${chain}. ` +
    `During practice, the executed steps were correct ${actionScore}, but the stated reasons ` +
    `were conceptually strong only ${reasonScore} of the time — indicating that some correct ` +
    `answers came from a memorized rule rather than real understanding. ` +
    `After practice and a differently-surfaced re-test, the status is: ${
      resolved ? `resolved (score now ${after}%)` : "not yet resolved — more practice is recommended"
    }.`
  );
}

export async function POST(req: NextRequest) {
  let body: ExplainRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true, source: "fallback", text: fallbackNarrative(body) });
  }

  const langInstruction =
    body.locale === "sw"
      ? "Andika kwa Kiswahili pekee. Hakuna Kiingereza hata neno moja."
      : "Write in English only. No Swahili.";

  const systemPrompt = `You write short, warm, factual summaries of a math diagnostic session for a Tanzanian secondary student and their teacher. You are NEVER asked to verify, compute, or judge any mathematics — every fact you are given (percentages, scores, the misconception id, the skill chain) has already been computed by a deterministic engine. Your only job is to turn those facts into 3-4 plain, encouraging sentences. Do not invent any number, skill name, or fact that was not given to you. Do not use the word "failure" or blame the student. ${langInstruction}`;

  const userPrompt = `Skill: ${body.skillLabel}
Misconception id: ${body.misconceptionId}
Misconception (from NECTA exam analysis): "${body.misconceptionQuote}"
Prerequisite chain (root cause first): ${body.chainLabels.join(" -> ")}
Score before practice: ${body.before}%
Score after practice: ${body.after}%
Action steps correct: ${body.actionScore}
Reason steps conceptually strong: ${body.reasonScore}
Re-test resolved: ${body.resolved ? "yes" : "no"}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: true, source: "fallback", text: fallbackNarrative(body) });
    }

    const data = await res.json();
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    if (!text) {
      return NextResponse.json({ ok: true, source: "fallback", text: fallbackNarrative(body) });
    }

    return NextResponse.json({ ok: true, source: "ai", text });
  } catch {
    return NextResponse.json({ ok: true, source: "fallback", text: fallbackNarrative(body) });
  }
}
