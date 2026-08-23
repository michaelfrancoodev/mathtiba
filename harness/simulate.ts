/**
 * Engineering validation.
 * Generates simulated students with KNOWN misconceptions, runs them through
 * the diagnostic, and measures whether the engine recovers what was injected.
 *
 *   npx tsx harness/simulate.ts > harness/results.json
 */
import items from "../data/items.json";
import misconceptions from "../data/misconceptions.json";
import { nextItem, getItem } from "../lib/diagnostic-engine";
import { scoreSkills, detectMisconceptions } from "../lib/misconception-engine";
import { findRootCause } from "../lib/root-cause";
import type { Attempt } from "../lib/types";

const N_STUDENTS = 50;
const NOISE = 0.08;
const SEED = 42;

/** Deterministic PRNG so results are reproducible. */
let seed = SEED;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const ALL_IDS = misconceptions.map((m) => m.id);

interface SimStudent {
  id: string;
  injected: string[];
}

function makeStudents(): SimStudent[] {
  return Array.from({ length: N_STUDENTS }, (_, i) => {
    const count = rand() < 0.4 ? 2 : 1;
    const injected: string[] = [];
    while (injected.length < count) {
      const pick = ALL_IDS[Math.floor(rand() * ALL_IDS.length)];
      if (!injected.includes(pick)) injected.push(pick);
    }
    return { id: `SIM-${String(i + 1).padStart(3, "0")}`, injected };
  });
}

function answer(itemId: string, injected: string[]): Attempt {
  const item = getItem(itemId)!;
  const trap = item.options.find(
    (o) => o.misconception && injected.includes(o.misconception)
  );
  const right = item.options.find((o) => o.correct)!;

  // Noise: an otherwise-correct student slips, or a misconception is masked.
  const slipped = rand() < NOISE;
  const chosen = slipped
    ? item.options[Math.floor(rand() * item.options.length)]
    : trap ?? right;

  return {
    itemId: item.id,
    skill: item.skill,
    answer: chosen.value,
    correct: chosen.correct,
    misconceptionId: chosen.correct ? null : chosen.misconception,
    responseTimeMs: 3000 + Math.floor(rand() * 9000),
    changes: 0,
    integrityFlag: null,
  };
}

function runOne(student: SimStudent) {
  const attempts: Attempt[] = [];
  let id = nextItem(attempts);
  while (id) {
    attempts.push(answer(id, student.injected));
    id = nextItem(attempts);
  }

  const detected = detectMisconceptions(attempts).map((m) => m.id);
  const root = findRootCause(scoreSkills(attempts));

  const found = student.injected.filter((m) => detected.includes(m));
  const falsePos = detected.filter((m) => !student.injected.includes(m));

  const expectedSkills = student.injected
    .map((id) => misconceptions.find((m) => m.id === id)?.skill)
    .filter(Boolean) as string[];

  // Items-to-detection: replay the SAME attempt sequence on growing prefixes
  // to find the earliest point at which ANY injected misconception first
  // crosses the detection threshold. This measures diagnostic efficiency
  // independently of whether the engine keeps asking items afterward.
  let detectionIndex = attempts.length; // cap: never detected within the run
  for (let i = 1; i <= attempts.length; i++) {
    const prefix = attempts.slice(0, i);
    const prefixDetected = detectMisconceptions(prefix).map((m) => m.id);
    if (student.injected.some((m) => prefixDetected.includes(m))) {
      detectionIndex = i;
      break;
    }
  }

  return {
    recovered: found.length,
    injected: student.injected.length,
    falsePositives: falsePos.length,
    detectedTotal: detected.length,
    rootCorrect: expectedSkills.includes(root.skillId),
    itemsUsed: attempts.length,
    itemsToDetection: detectionIndex,
    perMisconception: student.injected.map((m) => ({
      id: m,
      hit: detected.includes(m),
    })),
  };
}

function main() {
  const students = makeStudents();
  const runs = students.map(runOne);

  const injected = runs.reduce((s, r) => s + r.injected, 0);
  const recovered = runs.reduce((s, r) => s + r.recovered, 0);
  const detected = runs.reduce((s, r) => s + r.detectedTotal, 0);
  const falsePos = runs.reduce((s, r) => s + r.falsePositives, 0);
  const rootOk = runs.filter((r) => r.rootCorrect).length;
  const medianItems = runs.map((r) => r.itemsToDetection).sort((a, b) => a - b)[
    Math.floor(runs.length / 2)
  ];

  const perId = ALL_IDS.map((id) => {
    const rows = runs.flatMap((r) => r.perMisconception).filter((p) => p.id === id);
    const hit = rows.filter((p) => p.hit).length;
    return {
      id,
      injected: rows.length,
      detected: hit,
      recall: rows.length ? Math.round((hit / rows.length) * 100) : 0,
    };
  });

  const summary = {
    students: N_STUDENTS,
    noiseRate: NOISE,
    recoveryRate: Math.round((recovered / injected) * 100),
    falsePositiveRate: Math.round((falsePos / Math.max(detected, 1)) * 100),
    rootCauseAccuracy: Math.round((rootOk / runs.length) * 100),
    medianItemsToDetection: medianItems,
    perMisconception: perId,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();

// items import kept for future per-item calibration diagnostics
void items;
