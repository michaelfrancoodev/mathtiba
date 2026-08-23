import items from "@/data/items.json";
import type { Attempt } from "./types";

export interface SkillScore {
  skill: string;
  correct: number;
  total: number;
  percent: number;
}

export interface MisconceptionHit {
  id: string;
  hits: number;
  opportunities: number;
  confidence: number;
}

/** Percentage mastery per skill. */
export function scoreSkills(attempts: Attempt[]): SkillScore[] {
  const map = new Map<string, { correct: number; total: number }>();

  for (const a of attempts) {
    const s = map.get(a.skill) ?? { correct: 0, total: 0 };
    s.total += 1;
    if (a.correct) s.correct += 1;
    map.set(a.skill, s);
  }

  return [...map.entries()].map(([skill, s]) => ({
    skill,
    correct: s.correct,
    total: s.total,
    percent: s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100),
  }));
}

/**
 * Confidence = hits / opportunities, damped by evidence volume.
 * A single hit out of one opportunity is weak evidence; three out of
 * three is strong. The +1 in the denominator is Laplace smoothing.
 */
export function detectMisconceptions(attempts: Attempt[]): MisconceptionHit[] {
  const hits = new Map<string, number>();
  const opportunities = new Map<string, number>();

  for (const a of attempts) {
    const item = items.find((i) => i.id === a.itemId);
    if (!item) continue;

    // Every misconception this item could have revealed.
    for (const opt of item.options) {
      if (opt.misconception) {
        opportunities.set(
          opt.misconception,
          (opportunities.get(opt.misconception) ?? 0) + 1
        );
      }
    }

    // Low-confidence answers do not count as evidence of a misconception.
    if (a.integrityFlag === "LOW_CONFIDENCE") continue;

    if (a.misconceptionId) {
      hits.set(a.misconceptionId, (hits.get(a.misconceptionId) ?? 0) + 1);
    }
  }

  return [...hits.entries()]
    .map(([id, h]) => {
      const opp = opportunities.get(id) ?? 1;
      const confidence = h / (opp + 1);
      return {
        id,
        hits: h,
        opportunities: opp,
        confidence: Math.round(confidence * 100) / 100,
      };
    })
    .filter((m) => m.hits >= 2 || m.confidence >= 0.5)
    .sort((a, b) => b.confidence - a.confidence || b.hits - a.hits);
}
