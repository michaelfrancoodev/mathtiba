/**
 * Verifies the flexible corpus-answer checker against every real entry in
 * data/necta-corpus.json (self-consistency: the official answer must
 * check as correct against itself and against small formatting variants),
 * and against deliberately wrong answers (must be rejected).
 *
 *   npx tsx harness/test-corpus.ts
 */
import corpus from "../data/necta-corpus.json";
import { checkCorpusAnswer } from "../lib/corpus-check";

let pass = 0;
let fail = 0;
function check(cond: boolean, label: string) {
  if (cond) pass++;
  else {
    fail++;
    console.error(`FAIL: ${label}`);
  }
}

interface CorpusEntry {
  id: string;
  topic: string;
  content: string;
  answer?: string;
}

const entries = corpus as CorpusEntry[];

check(entries.length >= 20, `corpus has at least 20 entries (has ${entries.length})`);

for (const entry of entries) {
  check(!!entry.answer && entry.answer.length > 0, `${entry.id} has a non-empty answer`);
  if (!entry.answer) continue;

  const selfCheck = checkCorpusAnswer(entry.answer, entry.answer);
  check(selfCheck.correct, `${entry.id}: official answer matches itself`);
}

const variantCases: { id: string; userInput: string; shouldBeCorrect: boolean }[] = [
  { id: "NECTA-2020-Q1b-i", userInput: "24", shouldBeCorrect: true },
  { id: "NECTA-2020-Q1b-i", userInput: "25", shouldBeCorrect: false },
  { id: "NECTA-2020-Q7a-i", userInput: "3 : 1", shouldBeCorrect: true },
  { id: "NECTA-2020-Q7a-i", userInput: "1:3", shouldBeCorrect: false },
  { id: "NECTA-2020-Q7a-ii", userInput: "144000", shouldBeCorrect: true },
  { id: "NECTA-2020-Q7a-ii", userInput: "120000", shouldBeCorrect: false },
  { id: "NECTA-2020-Q4a-ii", userInput: "13", shouldBeCorrect: true },
  { id: "NECTA-2023-Q3b-i", userInput: "7/10", shouldBeCorrect: true },
  // approximate (decimal) answers should tolerate small rounding differences
  { id: "NECTA-2020-Q12a-i", userInput: "549", shouldBeCorrect: true }, // official ~550
  { id: "NECTA-2020-Q12a-i", userInput: "551", shouldBeCorrect: true },
  { id: "NECTA-2020-Q12a-i", userInput: "300", shouldBeCorrect: false },
  { id: "NECTA-2020-Q2b-i", userInput: "-4/3", shouldBeCorrect: true }, // negative fraction, order preserved
  { id: "NECTA-2020-Q2b-i", userInput: "4/3", shouldBeCorrect: false }, // sign matters
  { id: "NECTA-2020-Q8a", userInput: "first term 9, common difference 3", shouldBeCorrect: true },
  { id: "NECTA-2020-Q8a", userInput: "9 and 4", shouldBeCorrect: false },
];

for (const { id, userInput, shouldBeCorrect } of variantCases) {
  const entry = entries.find((e) => e.id === id);
  if (!entry?.answer) {
    fail++;
    console.error(`FAIL: could not find corpus entry ${id}`);
    continue;
  }
  const result = checkCorpusAnswer(entry.answer, userInput);
  check(
    result.correct === shouldBeCorrect,
    `${id}: input "${userInput}" vs official "${entry.answer}" -> expected correct=${shouldBeCorrect}, got ${result.correct} (${result.confidence})`
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
