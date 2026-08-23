import { NextRequest, NextResponse } from "next/server";

/**
 * GENERATIVE LAYER ONLY — second agent in the generative layer, alongside
 * app/api/explain. This route never reveals a correct answer and never
 * verifies or computes anything. It is called only when the deterministic
 * engine has already scored the student's chosen reason as weak
 * ("procedural" — right habit, no concept) or a known misconception
 * ("misconception" — the exact wrong rule was applied). Given only that
 * pre-computed label, it asks one short Socratic question that points the
 * student back toward re-examining their own reasoning — never the answer.
 *
 * Same graceful-degradation contract as app/api/explain: no key, a bad
 * key, or a failed/slow call all fall back to a deterministic template
 * keyed by reasonQuality, so /practice never blocks or breaks.
 */

interface HintRequest {
  locale: "en" | "sw";
  skillLabel: string;
  reasonQuality: "procedural" | "misconception" | "unknown";
  actionLabel: string;
  reasonText: string;
}

const FALLBACK: Record<"en" | "sw", Record<string, string>> = {
  en: {
    procedural:
      "That step is correct, but try explaining *why* it's allowed, not just that it's the usual move — what rule makes it valid here?",
    misconception:
      "Look again at the rule you just used — does it hold if you try it on a different, simpler example first?",
    unknown: "Before moving on, double-check the reason you picked against the actual rule for this step.",
  },
  sw: {
    procedural:
      "Hatua hiyo ni sahihi, lakini jaribu kueleza *kwa nini* inaruhusiwa, si tu kwamba ndiyo hatua ya kawaida — ni kanuni gani inayoifanya kuwa sahihi hapa?",
    misconception:
      "Angalia tena kanuni uliyotumia — je, inashikilia ukijaribu kwenye mfano rahisi zaidi kwanza?",
    unknown: "Kabla ya kuendelea, hakikisha sababu uliyochagua inalingana na kanuni halisi ya hatua hii.",
  },
};

function fallbackHint(body: HintRequest): string {
  const table = FALLBACK[body.locale] ?? FALLBACK.en;
  return table[body.reasonQuality] ?? table.unknown;
}

export async function POST(req: NextRequest) {
  let body: HintRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true, source: "fallback", text: fallbackHint(body) });
  }

  const langInstruction =
    body.locale === "sw"
      ? "Andika kwa Kiswahili pekee, sentensi moja au mbili tu."
      : "Write in English only, one or two sentences maximum.";

  const systemPrompt = `You give a single short Socratic hint to a secondary-school math student who just chose a weak or misconception-based justification for a correct-looking step. You are NEVER told, and must NEVER reveal, guess, or imply the correct answer or the correct reason. You only know a category label for the weakness ("procedural" = right move, no real understanding of why; "misconception" = a known wrong rule was applied) plus the skill name and the student's own words. Respond with ONE guiding question or prompt that sends the student back to re-examine their own reasoning — never a statement of fact, never the rule itself. Do not say "wrong" or "incorrect". ${langInstruction}`;

  const userPrompt = `Skill: ${body.skillLabel}
Action taken: ${body.actionLabel}
Reason category (pre-computed, do not question it): ${body.reasonQuality}
Student's own justification: "${body.reasonText}"`;

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
        max_tokens: 120,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: true, source: "fallback", text: fallbackHint(body) });
    }

    const data = await res.json();
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    if (!text) {
      return NextResponse.json({ ok: true, source: "fallback", text: fallbackHint(body) });
    }

    return NextResponse.json({ ok: true, source: "ai", text });
  } catch {
    return NextResponse.json({ ok: true, source: "fallback", text: fallbackHint(body) });
  }
}
