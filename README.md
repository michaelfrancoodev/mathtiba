# MathTiba

[![CI](https://github.com/michaelfrancoodev/mathtiba/actions/workflows/ci.yml/badge.svg)](https://github.com/michaelfrancoodev/mathtiba/actions/workflows/ci.yml)

**We find the misconception, not the score.**

MathTiba is a mathematical misconception & intervention engine for
Tanzanian secondary mathematics, built for the **Prometheus August AI
Challenge 2026**. It diagnoses *why* a student is failing, traces that
failure to the prerequisite skill gap that caused it, delivers a
targeted intervention, and then re-tests with a different surface to
confirm the misconception is actually gone — not just memorized around.

> In CSEE 2024, **74.65%** of candidates failed Basic Mathematics — a
> pattern that has repeated for seven consecutive years (NECTA CIRA
> reports, 2018–2024). MathTiba does not claim to fix Tanzanian
> mathematics education. It claims something smaller and provable: it
> can turn "the student failed" into "this is the misconception that
> caused it, this is the prerequisite gap, and this is an intervention
> that can be tested."

---

## Why this is not just another quiz app

| A normal system | MathTiba |
|---|---|
| Detects that the student got it wrong | Detects **what kind** of wrong |
| Records `correct: false` | Records a misconception id, its prerequisite, and a confidence score |
| Re-teaches the same topic | Walks back to the **root cause**, even if it's two Forms below |
| Grades the final answer | Grades **ACTION** and **REASON** independently |
| Gives the answer or a hint | Explains **why** a step is valid |

The central discovery MathTiba is built around: a student can reach the
*correct* answer for the *wrong* reason. `3x + 5 = 20 → 3x = 15` is a
correct step — but if the student's stated reason is "because 5 moves
to the other side" (treating a balance operation as a magic rule
rather than an equality-preserving transformation), they will pass
today's question and fail the next one that looks different. A normal
test cannot see this. MathTiba can, because it grades the action and
the reason as two independent, separately-scored signals.

---

## Architecture principle: AI never does math

The system is split into two layers that never cross:

```
DETERMINISTIC LAYER (no AI, no LLM, ever)     GENERATIVE LAYER (AI allowed)
─────────────────────────────────────────     ─────────────────────────────
Mathematical verification                      Explanations
Scoring                                        Hints
System rules                                   Swahili/English phrasing
Correctness decisions                          Encouragement
```

Every number MathTiba produces — every fraction sum, every percentage,
every LCM/GCF, every equation-balancing step — is computed by **exact
rational (BigInt-based) arithmetic** in `lib/fraction.ts` and
`lib/algebra.ts` (mirrored by a SymPy implementation in `engine/` for
Python/Vercel deployment). No floating point, no LLM, anywhere in the
correctness path. This is a structural claim, not a marketing one —
see `harness/test-engines.ts` for 40 passing assertions against this
exact math core, and `harness/test-pipeline.ts` for 19 more that
exercise the full diagnostic → root-cause → practice → retest → report
pipeline end-to-end.

---

## Evidence discipline: explicit vs. inferred

Every one of the 8 MVP misconceptions records whether NECTA's own CIRA
(Candidates' Item Response Analysis) reports **explicitly** named the
error, or whether MathTiba **inferred** it by operationalizing an
observed response pattern into a machine-detectable rule. This
distinction is shown on every report:

> *NECTA reported the observed difficulty. MathTiba operationalizes it
> into a machine-detectable misconception.*

This is a defensible, falsifiable claim — unlike an unverifiable "first
in the world" claim, which is why it's surfaced early rather than
buried in a footnote.

---

## The 7 pages

| Route | Audience | What it shows |
|---|---|---|
| `/` | Student | Landing: the problem, the promise, three steps |
| `/how`, `/about` | Anyone | How it works, project framing (supporting pages) |
| `/diagnostic` | Student | 22 adaptive items, one per screen, no time pressure, no feedback until the end |
| `/skill-map` | Student | Per-skill scores + **ROOT CAUSE IDENTIFIED** with the full prerequisite chain |
| `/practice` | Student | The core innovation: ACTION (what you did) + REASON (why), graded independently |
| `/retest` | Student | A transfer item — different surface, same underlying misconception, no hints |
| `/report` | Student & teacher | Before/after, ACTION vs REASON split, cited misconception evidence, resolved/unresolved status |
| `/validation` | Judges | The engineering validation harness results — recovery rate, false positives, root-cause accuracy, per-misconception recall table, and an honest **Known Limitations** panel |

---

## What's inside

```
mathtiba/
├── app/                     Next.js App Router — 7 pages + how/about + 2 API routes
│   ├── api/verify/          equation & expression verification (TS, no external services)
│   ├── api/check-answer/    fraction / percent / LCM-GCF verification (TS)
│   └── ...
├── components/ui/           Button, Card, Progress, TopBar, LocaleSwitch
├── lib/
│   ├── i18n/                en.json, sw.json, and the EN/SW switcher (no mixed-language screens)
│   ├── fraction.ts          exact BigInt rational arithmetic — the math core
│   ├── algebra.ts           single-variable linear equation/expression engine
│   ├── diagnostic-engine.ts adaptive item selection (coverage floor, then weakest-skill first)
│   ├── misconception-engine.ts  skill scoring + confidence-scored misconception detection
│   ├── root-cause.ts        prerequisite-graph walk to find the true root cause
│   ├── integrity.ts         LOW_CONFIDENCE flagging (rushed/guessed answers, never punitive)
│   └── storage.ts           localStorage wrapper (single-session MVP, namespaced keys)
├── data/                    misconceptions.json, curriculum.json, items.json,
│                            actions.json, reasons.json, interventions.json
├── engine/                  parser.py + verify.py — SymPy mirror for Vercel Python deploy
├── harness/
│   ├── simulate.ts          50 simulated students, engineering validation harness
│   ├── test-engines.ts      40 assertions against the math core
│   └── test-pipeline.ts     19 assertions against the full data pipeline
└── vercel.json              wires engine/verify.py to /api/verify-py on Vercel
```

---

## Deploy

MathTiba is a zero-config Next.js app — no database, no required
environment variables, no API keys. It deploys to Vercel as-is:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/michaelfrancoodev/mathtiba)

Or manually:

```bash
npm i -g vercel
vercel        # first deploy, follow the prompts
vercel --prod # promote to production
```

Vercel auto-detects Next.js and builds `npm run build`. The optional
`engine/verify.py` Python function (see below) deploys alongside it
automatically via `vercel.json` — if you'd rather not enable Python
functions on your Vercel project, it is safe to delete `vercel.json`
and the `engine/` folder entirely; the app uses the TypeScript
verifiers by default and nothing else references them.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Everything runs locally — no external
services, no API keys, no database. Diagnostic → skill map → practice
→ retest → report is a fully working loop end to end.

### Verify everything yourself

```bash
npm run test        # 40 math-core assertions + 19 full-pipeline assertions
npm run harness      # regenerates harness/results.json (50 simulated students)
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript, strict
npm run build        # production build — all 12 routes
```

All of the above are green in this repository as shipped.

### Current validation numbers (harness v0.1, n=50, seeded/reproducible)

| Metric | Value | Target |
|---|---|---|
| Recovery rate | 96% | > 80% |
| False positive rate | 0% | < 10% |
| Root-cause accuracy | 88% | > 75% |
| Median items to detection | 5 | < 15 |

These are simulated-student **engineering** validation numbers, not
classroom validation. `/validation` says so explicitly, along with
what the simulation does *not* model (no classroom trial, fixed 8%
noise rate, procedural slips excluded by design, simulated students
have no anxiety or fatigue).

---

## Language switching

Full EN / SW toggle, top-right on every page. One language at a time —
selecting SW replaces **every** visible string with Swahili, with zero
English left on screen, and the choice persists across all pages via
`localStorage`. This is structurally verified: every translation key
used anywhere in the codebase (91 static keys + 4 dynamic namespaces —
`skills`, `actions`, `reasons`, `arithmeticReasons`, covering 32 more
entries) exists in **both** `lib/i18n/en.json` and `lib/i18n/sw.json`
with no gaps in either direction.

Code — file names, route paths, data field names, misconception ids,
translation keys — is English-only, by design (per the project spec).
Swahili lives exclusively in the translation files.

---

## Scope (MVP, matching the hackathon brief)

**In scope:** one chain — Fractions → Percentages → Algebraic
expressions → Linear equations — 8 misconceptions (concept-confusion
and rule-overgeneralization types only; procedural slips and
representation failures are deliberately excluded, see the project
spec's taxonomy discussion), 22 diagnostic items, a 50-student
simulated validation harness, and a single report page usable by both
student and teacher.

**Out of scope (documented, not hidden):** the full Form I–IV
curriculum, word→equation construction interfaces, classroom trials,
teacher dashboards, accounts/login, offline mode. See `/validation`
for the full known-limitations list.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind v4 | Single deploy, one link for judges |
| Verification | Exact BigInt arithmetic (TS) + SymPy mirror (Python, for Vercel) | Deterministic, zero AI in the correctness path |
| Data | 6 JSON files | No database, no login needed for the MVP |
| Storage | `localStorage` | One session is enough for the MVP |
| Deploy | Vercel (or any Node host) | Free, one link |

---

## Optional: SymPy-backed verifier

`app/api/verify` and `app/api/check-answer` (TypeScript, exact BigInt
arithmetic) are the verifiers the app actually uses, everywhere,
including on Vercel — no configuration needed. `engine/verify.py` +
`engine/parser.py` are provided as a **mirror implementation using
SymPy**, showing the same verification logic in the Python/SymPy
stack referenced in the original project spec. `vercel.json` deploys
it as a separate serverless function at `/api/verify-py` if you deploy
to Vercel; it is not called by the frontend by default, and nothing
breaks if you deploy without Python support.

## Fonts

The project ships without a build-time dependency on Google Fonts
(some networks/CI environments block `fonts.googleapis.com`, which
would otherwise break `npm run build`). It uses a system-font stack
that resolves to Inter / JetBrains Mono if installed locally, falling
back to sensible system fonts otherwise. If you want the exact
webfonts baked in, re-add `next/font/google` in `app/layout.tsx` once
you have unrestricted network access, or self-host the font files.

---

## Sources

NECTA — Candidates' Item Response Analysis (CIRA), Basic Mathematics
041, reports 2018–2024 · NECTA CSEE 2023/2024 results · NECTA FTNA
Examination Format 043 Mathematics, 2026 · Taasisi ya Elimu Tanzania
(TIE) — Mathematics Syllabus, Form I–IV, 2023.

---

## License

Built for the Prometheus August AI Challenge 2026.
