import { NextRequest, NextResponse } from "next/server";
import { Fraction } from "@/lib/fraction";
import {
  parseEquation,
  formatEquation,
  applyEquationAction,
  equationEquivalent,
  equationIsSolved,
  expandBracket,
  collectExpr,
  formatLinearExpr,
  linearExprEquivalent,
  type EquationOp,
} from "@/lib/algebra";

/**
 * Deterministic mathematical verification. No AI/LLM is involved anywhere
 * in this route — every response is computed by exact rational arithmetic.
 * This mirrors api/verify-py.py (SymPy), used when the project is deployed
 * with a Python serverless function; this TS route is the default so that
 * `npm run dev` works with zero external services.
 */
export async function POST(req: NextRequest) {
  let body: { expression?: string; op?: string; value?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const { expression, op, value } = body;
  if (!expression || !op) {
    return NextResponse.json({ ok: false, error: "missing expression or op" });
  }

  try {
    // Expression mode (no "=") — used for algebra/bracket practice tasks.
    if (!expression.includes("=")) {
      if (op === "expand") {
        const after = expandBracket(expression);
        const outExpr = formatLinearExpr(after);
        return NextResponse.json({
          ok: true,
          valid: true,
          expression: outExpr,
          solved: true,
          progress: expression.trim() !== outExpr,
        });
      }
      if (op === "collect") {
        const collected = collectExpr(expression);
        const outExpr = formatLinearExpr(collected);
        return NextResponse.json({
          ok: true,
          valid: true,
          expression: outExpr,
          solved: true,
          progress: true,
        });
      }
      return NextResponse.json({
        ok: false,
        error: "this action does not apply to a non-equation expression",
      });
    }

    // Equation mode — balance-preserving actions.
    if (op === "expand" || op === "collect") {
      return NextResponse.json({
        ok: false,
        error: "expand/collect are not balance actions; use them on a bare expression",
      });
    }

    const eq = parseEquation(expression);
    const v = value === null || value === undefined ? new Fraction(0n) : new Fraction(value);
    const newEq = applyEquationAction(eq, op as EquationOp, v);

    const valid = equationEquivalent(eq, newEq);
    const outExpr = formatEquation(newEq);

    return NextResponse.json({
      ok: true,
      valid,
      expression: outExpr,
      solved: valid && equationIsSolved(newEq),
      progress: outExpr.length < expression.length,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "verification error",
    });
  }
}

// linearExprEquivalent is exported from lib/algebra for potential future use
// (e.g. verifying an intermediate collect step against a target); referenced
// here to avoid an unused-import lint error while keeping the API surface.
void linearExprEquivalent;
