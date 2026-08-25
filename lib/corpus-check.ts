/**
 * Deterministic (non-AI) flexible answer checker for the NECTA corpus.
 * Corpus answers are free-form strings ("24 marks", "3:1", "x = -4/3",
 * "AP = 12cm, CP = 9cm") rather than a single clean numeric value, so an
 * exact-string or single-Fraction check (as used in lib/fraction.ts /
 * lib/algebra.ts for the curated intervention tasks) is too strict here.
 *
 * This checker normalizes both the stored answer and the student's input
 * and compares the ORDERED sequence of numbers found in each (order
 * matters — "3:1" must not equal "1:3") — a pragmatic, fully
 * deterministic approach that tolerates different units, labels, and
 * spacing, while requiring the numeric content and its order to match.
 * Only genuinely approximate answers (containing a decimal point or an
 * explicit "approx" marker) are given a small relative tolerance;
 * whole-number answers require an EXACT match.
 */

export interface CorpusCheckResult {
  correct: boolean;
  confidence: "exact" | "numeric-match" | "no-match";
  officialAnswer: string;
}

/** Matches numbers with optional thousands-comma grouping, e.g. "144,000" or "3.14". */
function extractNumbers(s: string): number[] {
  const matches = s.match(/-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g) ?? [];
  return matches.map((m) => Number(m.replace(/,/g, "")));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/tshs\.?|shillings?|marks?|cm3|cm|km\/h|km|m\b|approximately|approx\.?/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function isApproximate(officialAnswer: string): boolean {
  return /approx|\d\.\d/.test(officialAnswer.toLowerCase());
}

function numbersMatch(official: number[], user: number[], approximate: boolean): boolean {
  if (official.length !== user.length || official.length === 0) return false;
  const tolerance = approximate ? 0.02 : 0; // 2% only for explicitly approximate answers
  for (let i = 0; i < official.length; i++) {
    if (tolerance === 0) {
      if (official[i] !== user[i]) return false;
    } else {
      const diff = Math.abs(official[i] - user[i]);
      const scale = Math.max(Math.abs(official[i]), 1);
      if (diff / scale > tolerance) return false;
    }
  }
  return true;
}

export function checkCorpusAnswer(officialAnswer: string, userAnswer: string): CorpusCheckResult {
  const normOfficial = normalize(officialAnswer);
  const normUser = normalize(userAnswer);

  if (normOfficial === normUser && normUser.length > 0) {
    return { correct: true, confidence: "exact", officialAnswer };
  }

  const numsOfficial = extractNumbers(officialAnswer);
  const numsUser = extractNumbers(userAnswer);
  const approximate = isApproximate(officialAnswer);

  if (numbersMatch(numsOfficial, numsUser, approximate)) {
    return { correct: true, confidence: "numeric-match", officialAnswer };
  }

  return { correct: false, confidence: "no-match", officialAnswer };
}
