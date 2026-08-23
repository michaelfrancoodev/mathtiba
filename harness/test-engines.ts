/**
 * Correctness tests for the deterministic math core (no AI/LLM involved).
 * Run with: npx tsx harness/test-engines.ts
 */
import { Fraction, evalFractionExpr, evalPercentOf, evalLcmGcf, parseFraction } from "../lib/fraction";
import {
  parseEquation,
  formatEquation,
  applyEquationAction,
  equationEquivalent,
  equationIsSolved,
  expandBracket,
  formatLinearExpr,
  collectExpr,
} from "../lib/algebra";

let pass = 0;
let fail = 0;

function assertEq(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
  } else {
    fail++;
    console.error(`FAIL: ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(cond: boolean, label: string) {
  if (cond) pass++;
  else {
    fail++;
    console.error(`FAIL: ${label}`);
  }
}

// --- Fraction arithmetic ---
assertEq(evalFractionExpr("3/4 + 1/2").toString(), "5/4", "3/4 + 1/2");
assertEq(evalFractionExpr("1/2 + 1/4").toString(), "3/4", "1/2 + 1/4");
assertEq(evalFractionExpr("2/3 + 1/6").toString(), "5/6", "2/3 + 1/6");
assertEq(evalFractionExpr("1/6 + 1/4").toString(), "5/12", "1/6 + 1/4");
assertTrue(parseFraction("5/4").eq(new Fraction(5n, 4n)), "parseFraction 5/4");
assertTrue(parseFraction("1 1/4").eq(new Fraction(5n, 4n)), "parseFraction mixed 1 1/4");

// --- Percentages ---
assertEq(evalPercentOf("20% of 250").toString(), "50", "20% of 250");
assertEq(evalPercentOf("10% of 200").toString(), "20", "10% of 200");
assertEq(evalPercentOf("15% of 300").toString(), "45", "15% of 300");

// --- LCM / GCF ---
assertEq(evalLcmGcf("LCM(12, 18)").toString(), "36", "LCM(12,18)");
assertEq(evalLcmGcf("GCF(24, 36)").toString(), "12", "GCF(24,36)");
assertEq(evalLcmGcf("LCM(4, 6)").toString(), "12", "LCM(4,6)");
assertEq(evalLcmGcf("GCF(18, 24)").toString(), "6", "GCF(18,24)");

// --- Equation solving: 3x + 5 = 20 -> subtract 5 -> divide 3 -> x = 5 ---
{
  const eq = parseEquation("3x + 5 = 20");
  assertEq(formatEquation(eq), "3x + 5 = 20", "parse 3x+5=20");

  const afterSub = applyEquationAction(eq, "subtract", new Fraction(5n));
  assertTrue(equationEquivalent(eq, afterSub), "subtract preserves equivalence");
  assertEq(formatEquation(afterSub), "3x = 15", "3x+5=20 minus 5 -> 3x=15");
  assertTrue(!equationIsSolved(afterSub), "3x=15 not yet solved");

  const afterDiv = applyEquationAction(afterSub, "divide", new Fraction(3n));
  assertTrue(equationEquivalent(afterSub, afterDiv), "divide preserves equivalence");
  assertEq(formatEquation(afterDiv), "x = 5", "3x=15 divided by 3 -> x=5");
  assertTrue(equationIsSolved(afterDiv), "x=5 is solved");
}

// --- Equation solving: 2x - 7 = 9 -> add 7 -> divide 2 -> x = 8 ---
{
  const eq = parseEquation("2x - 7 = 9");
  const afterAdd = applyEquationAction(eq, "add", new Fraction(7n));
  assertEq(formatEquation(afterAdd), "2x = 16", "2x-7=9 plus 7 -> 2x=16");
  const afterDiv = applyEquationAction(afterAdd, "divide", new Fraction(2n));
  assertEq(formatEquation(afterDiv), "x = 8", "2x=16 divided by 2 -> x=8");
  assertTrue(equationIsSolved(afterDiv), "x=8 is solved");
}

// --- equationEquivalent correctly rejects equations with a genuinely different root ---
{
  // Any balanced subtract/add/divide/multiply preserves the root by construction
  // (that IS the architectural guarantee — the student cannot apply an operation
  // to only one side). What equationEquivalent must catch is an equation that
  // truly has a different solution.
  const target = parseEquation("x = 5");
  const unrelated = parseEquation("x = 6");
  assertTrue(!equationEquivalent(target, unrelated), "x=5 is NOT equivalent to x=6");

  const eq = parseEquation("3x + 5 = 20"); // root x = 5
  const afterAnySubtract = applyEquationAction(eq, "subtract", new Fraction(2n)); // still root x=5
  assertTrue(equationEquivalent(afterAnySubtract, target), "any balanced subtract preserves the true root (x=5)");
}

// --- Bracket expansion (matches the real intervention task-bank patterns) ---
assertEq(formatLinearExpr(expandBracket("3(x + 4)")), "3x + 12", "expand 3(x+4)");
assertEq(formatLinearExpr(expandBracket("-2(x - 3)")), "-2x + 6", "expand -2(x-3)");
assertEq(formatLinearExpr(expandBracket("2(x + 3)")), "2x + 6", "expand 2(x+3)");
assertEq(formatLinearExpr(expandBracket("4(y - 2)")), "4y - 8", "expand 4(y-2)");
assertEq(formatLinearExpr(expandBracket("-3(a + 1)")), "-3a - 3", "expand -3(a+1)");
assertEq(formatLinearExpr(expandBracket("5(x - 2)")), "5x - 10", "expand 5(x-2)");

// --- Collect like terms ---
assertEq(formatLinearExpr(collectExpr("5y + 2y - 3")), "7y - 3", "collect 5y+2y-3");
assertEq(formatLinearExpr(collectExpr("3x + 4")), "3x + 4", "collect 3x+4 (identity)");
assertEq(formatLinearExpr(collectExpr("2x + 5")), "2x + 5", "collect 2x+5 (identity)");

// --- Multi-variable equations from intervention bank ---
for (const [expr, target] of [
  ["3x + 5 = 20", "x = 5"],
  ["2x + 7 = 19", "x = 6"],
  ["5x - 4 = 16", "x = 4"],
  ["4x + 9 = 25", "x = 4"],
  ["6x - 3 = 21", "x = 4"],
  ["7x + 2 = 23", "x = 3"],
] as const) {
  const eq = parseEquation(expr);
  const target_eq = parseEquation(target);
  const b = eq.rhs.constant.sub(eq.lhs.constant); // move constant: coeff*x = b
  const solX = b.div(eq.lhs.coeff);
  assertTrue(solX.eq(target_eq.rhs.constant), `${expr} solves to ${target}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
