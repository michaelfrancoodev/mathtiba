import curriculum from "@/data/curriculum.json";
import type { Skill } from "./types";
import type { SkillScore } from "./misconception-engine";

const GRAPH = curriculum as Skill[];
const WEAK_THRESHOLD = 50;

export interface RootCause {
  skillId: string;
  chain: { skillId: string; percent: number }[];
  reason: "prerequisite_gap" | "no_weakness" | "insufficient_data";
}

function percentOf(scores: SkillScore[], id: string): number | null {
  return scores.find((s) => s.skill === id)?.percent ?? null;
}

function isWeak(scores: SkillScore[], id: string): boolean {
  const p = percentOf(scores, id);
  return p !== null && p < WEAK_THRESHOLD;
}

/**
 * Walk down from the weakest high-level skill through its prerequisites.
 * Stop at the deepest skill that is still weak — that is the root cause.
 * Skills the student has mastered terminate the walk.
 */
export function findRootCause(scores: SkillScore[]): RootCause {
  if (scores.length === 0)
    return { skillId: "", chain: [], reason: "insufficient_data" };

  const weak = scores
    .filter((s) => s.percent < WEAK_THRESHOLD)
    .sort((a, b) => {
      const la = GRAPH.find((g) => g.id === a.skill)?.level ?? 0;
      const lb = GRAPH.find((g) => g.id === b.skill)?.level ?? 0;
      return lb - la; // highest level first
    });

  if (weak.length === 0)
    return { skillId: "", chain: [], reason: "no_weakness" };

  const chain: { skillId: string; percent: number }[] = [];
  const seen = new Set<string>();
  let current: string | undefined = weak[0].skill;

  while (current && !seen.has(current)) {
    seen.add(current);
    chain.push({ skillId: current, percent: percentOf(scores, current) ?? 0 });

    const node = GRAPH.find((g) => g.id === current);
    if (!node || node.prerequisites.length === 0) break;

    // Follow the weakest weak prerequisite.
    const weakPrereqs = node.prerequisites
      .filter((p) => isWeak(scores, p))
      .sort((a, b) => (percentOf(scores, a) ?? 100) - (percentOf(scores, b) ?? 100));

    if (weakPrereqs.length === 0) break; // prerequisites are solid — stop
    current = weakPrereqs[0];
  }

  return {
    skillId: chain[chain.length - 1].skillId,
    chain: chain.reverse(), // display root first
    reason: "prerequisite_gap",
  };
}
