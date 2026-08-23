/**
 * Full-pipeline integration test: simulates one real student session through
 * every stage a page component drives — diagnostic answers, skill scoring,
 * root-cause walk, practice verification, re-test, and report assembly —
 * using the exact same lib functions the React pages call. This proves the
 * data pipeline is internally consistent end-to-end without a browser.
 *
 *   npx tsx harness/test-pipeline.ts
 */
import items from "../data/items.json";
import interventions from "../data/interventions.json";
import misconceptionsData from "../data/misconceptions.json";
import { nextItem, getItem, TOTAL_ITEMS } from "../lib/diagnostic-engine";
import { scoreSkills, detectMisconceptions } from "../lib/misconception-engine";
import { findRootCause } from "../lib/root-cause";
import { assessAttempt, sessionIntegrity } from "../lib/integrity";
import { Fraction } from "../lib/fraction";
import {
  parseEquation,
  formatEquation,
  applyEquationAction,
  equationEquivalent,
  equationIsSolved,
} from "../lib/algebra";
import type { Attempt, Step } from "../lib/types";

let pass = 0;
let fail = 0;
function check(cond: boolean, label: string) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error(`FAIL: ${label}`);
  }
}

console.log("--- STAGE 1: Diagnostic (a student who consistently picks the FRA-ADD-SEP trap) ---");
const attempts: Attempt[] = [];
let id = nextItem(attempts);
let count = 0;
while (id && count < TOTAL_ITEMS) {
  const item = getItem(id)!;
  const trap = item.options.find((o) => o.misconception === "FRA-ADD-SEP");
  const chosen = trap ?? item.options.find((o) => o.correct)!;
  const elapsed = 4000;
  const { flag } = assessAttempt(elapsed, 0, 0);
  attempts.push({
    itemId: item.id,
    skill: item.skill,
    answer: chosen.value,
    correct: chosen.correct,
    misconceptionId: chosen.correct ? null : chosen.misconception,
    responseTimeMs: elapsed,
    changes: 0,
    integrityFlag: flag,
  });
  count++;
  id = nextItem(attempts);
}
check(attempts.length === TOTAL_ITEMS, `diagnostic collected all ${TOTAL_ITEMS} items (got ${attempts.length})`);
check(sessionIntegrity(attempts) === "clean", "session integrity is clean for well-paced honest answers");

console.log("--- STAGE 2: Skill scoring + root cause ---");
const scores = scoreSkills(attempts);
const fractionsScore = scores.find((s) => s.skill === "FRACTIONS");
check(!!fractionsScore && fractionsScore.percent < 50, "FRACTIONS skill scored weak, as expected from the trap pattern");

const root = findRootCause(scores);
check(root.reason === "prerequisite_gap", "a root cause was identified");
check(root.chain.length >= 1, "root cause chain is non-empty");

const detected = detectMisconceptions(attempts);
const top = detected[0];
check(!!top && top.id === "FRA-ADD-SEP", `top detected misconception is FRA-ADD-SEP (got ${top?.id})`);

console.log("--- STAGE 3: Practice (equation mode, real interventions.json task) ---");
const bank = interventions as Record<
  string,
  { skill: string; mode: string; tasks: { id: string; expression: string; answer: string }[] }
>;
const eqBank = bank["EQU-MOVE-FLIP"];
check(eqBank.mode === "equation", "EQU-MOVE-FLIP bank is equation mode");

const task = eqBank.tasks[0]; // "3x + 5 = 20"
let eq = parseEquation(task.expression);
const steps: Step[] = [
  { index: 1, expression: task.expression, actionId: null, actionValue: null, reasonId: null, reasonQuality: null, verified: true },
];

{
  const next = applyEquationAction(eq, "subtract", new Fraction(5n));
  check(equationEquivalent(eq, next), "subtract 5 step preserves equivalence");
  eq = next;
  steps.push({
    index: 2,
    expression: formatEquation(eq),
    actionId: "SUB_BOTH",
    actionValue: 5,
    reasonId: "R_BALANCE",
    reasonQuality: "conceptual",
    verified: true,
  });
}
{
  // Correct ACTION, weak REASON — the paper's central detectable pattern.
  const next = applyEquationAction(eq, "divide", new Fraction(3n));
  check(equationEquivalent(eq, next), "divide by 3 step preserves equivalence");
  eq = next;
  steps.push({
    index: 3,
    expression: formatEquation(eq),
    actionId: "DIV_BOTH",
    actionValue: 3,
    reasonId: "R_MOVE_ACROSS",
    reasonQuality: "misconception",
    verified: true,
  });
}
check(equationIsSolved(eq), "equation reached solved state x = 5");
check(formatEquation(eq) === "x = 5", `final equation is "x = 5" (got "${formatEquation(eq)}")`);

const graded = steps.filter((s) => s.reasonQuality !== null);
const strong = graded.filter((s) => s.reasonQuality === "conceptual" || s.reasonQuality === "procedural");
check(graded.length === 2, "2 graded steps recorded");
check(strong.length === 1, "exactly 1 of 2 steps shows strong reasoning (ACTION 2/2, REASON 1/2 pattern)");

console.log("--- STAGE 4: Re-test (different surface, same misconception) ---");
const fraRetest = (
  interventions as Record<string, { retest: { options: { value: string; correct: boolean }[] } }>
)["FRA-ADD-SEP"].retest;
const correctOption = fraRetest.options.find((o) => o.correct);
check(!!correctOption, "FRA-ADD-SEP retest has a correct option available");

console.log("--- STAGE 5: Report assembly ---");
const mc = misconceptionsData.find((m) => m.id === "FRA-ADD-SEP");
check(!!mc && mc.evidence.length > 0, "FRA-ADD-SEP misconception carries evidence records");
check(
  !!mc && mc.evidence.every((e) => e.type === "explicit" || e.type === "inferred"),
  "every evidence record is explicit or inferred"
);

console.log("--- STAGE 6: Every item distractor links to a real misconception id ---");
const knownIds = new Set(misconceptionsData.map((m) => m.id));
let badLinks = 0;
for (const it of items) {
  for (const opt of it.options) {
    if (opt.misconception && !knownIds.has(opt.misconception)) {
      badLinks++;
      console.error(`  broken link: ${it.id} -> ${opt.misconception}`);
    }
  }
}
check(badLinks === 0, "every diagnostic item distractor links to a real misconception id");

console.log("--- STAGE 7: Every misconception used by interventions.json exists in misconceptions.json ---");
let badBank = 0;
for (const key of Object.keys(bank)) {
  if (!knownIds.has(key)) {
    badBank++;
    console.error(`  interventions.json has an unknown misconception key: ${key}`);
  }
}
check(badBank === 0, "every interventions.json key matches a real misconception id");
check(Object.keys(bank).length === misconceptionsData.length, "interventions.json covers all 8 misconceptions");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
