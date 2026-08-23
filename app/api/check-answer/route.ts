import { NextRequest, NextResponse } from "next/server";
import { Fraction, evalFractionExpr, evalPercentOf, evalLcmGcf, parseFraction } from "@/lib/fraction";

/**
 * Deterministic arithmetic verification for non-algebraic practice tasks
 * (fraction addition, percentages, LCM/GCF). No AI/LLM involved — exact
 * BigInt-based rational arithmetic only.
 */
export async function POST(req: NextRequest) {
  let body: { expression?: string; userAnswer?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const { expression, userAnswer } = body;
  if (!expression || userAnswer === undefined) {
    return NextResponse.json({ ok: false, error: "missing expression or userAnswer" });
  }

  try {
    let expected: Fraction | bigint;
    let expectedStr: string;

    if (/^(LCM|GCF)\(/i.test(expression.trim())) {
      expected = evalLcmGcf(expression);
      expectedStr = expected.toString();
    } else if (/%/.test(expression)) {
      expected = evalPercentOf(expression);
      expectedStr = expected.toString();
    } else {
      expected = evalFractionExpr(expression);
      expectedStr = expected.toString();
    }

    let correct: boolean;
    if (typeof expected === "bigint") {
      const userTrim = userAnswer.replace(/\s+/g, "");
      correct = userTrim === expected.toString();
    } else {
      const userFraction = parseFraction(userAnswer.replace(/\s+/g, " ").trim());
      correct = userFraction.eq(expected);
    }

    return NextResponse.json({ ok: true, correct, expected: expectedStr });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "check error",
    });
  }
}
