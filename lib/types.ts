export type EvidenceType = "explicit" | "inferred";
export type MisconceptionType = "concept_confusion" | "rule_overgeneralization";
export type ReasonQuality = "conceptual" | "procedural" | "misconception" | "unknown";

export interface Evidence {
  source: string;
  year: number;
  type: EvidenceType;
}

export interface Misconception {
  id: string;
  skill: string;
  prerequisite: string | null;
  type: MisconceptionType;
  evidence: Evidence[];
  quote: string;
  observable_patterns: string[];
  diagnostic_items: string[];
  intervention: string[];
  mastery_rule: { correct_attempts: number; different_contexts: number };
}

export interface Skill {
  id: string;
  form: 1 | 2 | 3 | 4;
  level: number;
  prerequisites: string[];
}

export interface Attempt {
  itemId: string;
  skill: string;
  answer: string;
  correct: boolean;
  misconceptionId: string | null;
  responseTimeMs: number;
  changes: number;
  integrityFlag: "LOW_CONFIDENCE" | null;
}

export interface Step {
  index: number;
  expression: string;
  actionId: string | null;
  actionValue: number | null;
  reasonId: string | null;
  reasonQuality: ReasonQuality | null;
  verified: boolean;
}
