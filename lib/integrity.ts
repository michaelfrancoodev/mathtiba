import type { Attempt } from "./types";

export interface IntegritySignal {
  flag: "LOW_CONFIDENCE" | null;
  reasons: string[];
}

const MIN_TIME_MS = 2000;
const MAX_CHANGES = 3;

export function assessAttempt(
  responseTimeMs: number,
  changes: number,
  consecutiveWrong: number
): IntegritySignal {
  const reasons: string[] = [];

  if (responseTimeMs < MIN_TIME_MS) reasons.push("response_too_fast");
  if (changes >= MAX_CHANGES) reasons.push("repeated_answer_changes");
  if (consecutiveWrong >= 3) reasons.push("consecutive_incorrect");

  // A single weak signal is not enough — we require two.
  return { flag: reasons.length >= 2 ? "LOW_CONFIDENCE" : null, reasons };
}

/** Reason choices that flip without the action changing suggest guessing. */
export function assessReasonConsistency(
  reasonChangesWithSameAction: number
): boolean {
  return reasonChangesWithSameAction >= 2;
}

export function sessionIntegrity(attempts: Attempt[]): "clean" | "review" {
  const flagged = attempts.filter((a) => a.integrityFlag).length;
  return flagged / Math.max(attempts.length, 1) > 0.2 ? "review" : "clean";
}
