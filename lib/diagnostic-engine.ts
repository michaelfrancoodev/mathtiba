import items from "@/data/items.json";
import type { Attempt } from "./types";

const SKILL_ORDER = [
  "NUM-OPS",
  "FRACTIONS",
  "PERCENTAGES",
  "ALG-EXPR",
  "ALG-BRACKETS",
  "LIN-EQ",
];

const MIN_PER_SKILL = 2;
const MAX_ITEMS = 22;

/**
 * Adaptive selection: cover every skill with a floor of MIN_PER_SKILL,
 * then spend remaining budget on skills that look weak, since that is
 * where extra evidence changes the diagnosis.
 */
export function nextItem(answered: Attempt[]): string | null {
  if (answered.length >= MAX_ITEMS) return null;

  const done = new Set(answered.map((a) => a.itemId));
  const perSkill = new Map<string, { seen: number; wrong: number }>();

  for (const a of answered) {
    const s = perSkill.get(a.skill) ?? { seen: 0, wrong: 0 };
    s.seen += 1;
    if (!a.correct) s.wrong += 1;
    perSkill.set(a.skill, s);
  }

  // Phase 1 — coverage floor.
  for (const skill of SKILL_ORDER) {
    const seen = perSkill.get(skill)?.seen ?? 0;
    if (seen < MIN_PER_SKILL) {
      const candidate = items.find((i) => i.skill === skill && !done.has(i.id));
      if (candidate) return candidate.id;
    }
  }

  // Phase 2 — spend the rest where the signal is weakest.
  const ranked = [...perSkill.entries()]
    .map(([skill, s]) => ({ skill, rate: s.wrong / Math.max(s.seen, 1) }))
    .sort((a, b) => b.rate - a.rate);

  for (const { skill } of ranked) {
    const candidate = items.find((i) => i.skill === skill && !done.has(i.id));
    if (candidate) return candidate.id;
  }

  return items.find((i) => !done.has(i.id))?.id ?? null;
}

export function getItem(id: string) {
  return items.find((i) => i.id === id) ?? null;
}

export const TOTAL_ITEMS = MAX_ITEMS;
