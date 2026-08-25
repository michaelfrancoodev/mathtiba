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

## Full syllabus, not a narrow demo

MathTiba's prerequisite graph covers **28 topics** spanning the entire
Basic Mathematics 041 syllabus (Form I-IV) — not just a 4-topic
algebra slice. See `data/curriculum.json` and `/topics`.

Every topic falls into one of three honestly-labeled depth tiers,
visible in the product itself, not hidden:

1. **Full misconception depth** (8 topics: the original algebra chain)
   — diagnostic + root-cause tracing + the ACTION+REASON practice
   workspace + re-test, all deterministic.
2. **Real NECTA question practice** (15 topics) — practice powered by
   `data/necta-corpus.json`, a **hand-verified corpus of 20 real
   questions transcribed from two actual, fetched NECTA CSEE past
   papers** (2020 and 2023, official `maktaba.tetea.org` PDFs), each
   citing its exact source and year, with answers independently
   recomputed and checked (see `harness/test-corpus.ts`, 56/56
   passing). This is retrieval-grounded, not synthetically generated:
   `/practice?topic=X` for these topics shows a real, cited past-paper
   question, not an invented one.
3. **Diagnosed but content still growing** (remaining topics) — the
   skill map and root-cause tracing already include them; deep
   practice content is being added incrementally rather than faked to
   look complete.

### Why RAG over NECTA papers, not just "yet another AI tutor"

Several existing products already do "AI chatbot + past papers" for
this exact exam system (Asili Chat, ElimuAI, EduMate Africa target
Tanzania/NECTA specifically; TopScore AI and SOMANASI target the wider
East African market). That combination alone is not novel. What none
of them appear to do is combine real exam-question grounding with
**misconception-level, evidence-linked diagnosis and independent
ACTION+REASON grading** — RAG here feeds the diagnostic engine real
material; it does not replace it with a generic Q&A chatbot.

`lib/rag.ts` is intentionally zero-infrastructure: the corpus ships as
a static JSON file, not a hosted vector database. Retrieval uses
Gemini embeddings when `GEMINI_API_KEY` is set, and falls back to a
deterministic keyword-overlap score otherwise — both paths are tested
and working, and the code is honest about which one served a given
result (`method: "embedding" | "keyword"` in every response). The
keyword fallback is measurably weaker at ranking semantically related
but differently-worded content than real embeddings would be — that
limitation is left visible rather than hidden.

One real constraint discovered while building this: **not every NECTA
PDF is text-extractable**. The 2020 and 2023 Basic Mathematics papers
have a clean text layer; 2021's does not (it is a scanned image and
would require OCR, out of scope for this MVP). The ingestion approach
here — fetch, attempt text extraction, skip and log papers that come
back as scanned images rather than silently failing — is the honest
way to scale this corpus further.

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

## Research basis (not invented from scratch)

The claim that student errors follow **consistent, diagnosable rules**
rather than random noise is not new — it goes back to Payne & Squibb's
1990 "mal-rules" theory of algebra errors (*Cognitive Science*,
14(3):445–481), which is still the foundational citation for
rule-based misconception modeling today (e.g. Rice University's 2026
`MalAlgoLib` benchmark builds its algebra misconception taxonomy
directly on it). MathTiba's `ALG-BRA-DIST` misconception
("distribution as addition", `3(x+4) → 3x+4`) is, almost verbatim, mal-rule
M1 from that taxonomy.

Recent work applying **LLMs directly** to misconception detection
(e.g. GPT-4 evaluated on a 55-misconception middle-school algebra
benchmark) reports **~84% accuracy**, with explicitly weaker
performance on ambiguous categories like ratios and proportional
reasoning. MathTiba deliberately does **not** ask a language model to
*infer* a misconception from free-text reasoning — every misconception
is observed directly from a pre-designed distractor the student chose.
That narrower, more mechanical claim is why the engineering validation
harness in this repository reaches **96% recovery with 0% false
positives** within its scoped domain (8 misconceptions, one skill
chain) — a smaller claim than "AI can detect any misconception," and a
considerably more defensible one for a hackathon judge to check.

## Generative AI layer: two agents, optional, additive, never in the correctness path

Two separate LLM calls (Anthropic Claude via `ANTHROPIC_API_KEY`),
each scoped to one narrow job and each given only facts a
deterministic engine already computed:

| Agent | Route | Triggered when | Job |
|---|---|---|---|
| **Explainer** | `app/api/explain` | Student reaches `/report` | Turns already-computed scores/chain/resolved-status into a short warm summary paragraph |
| **Hint** | `app/api/hint` | On `/practice`, right after a step is scored `procedural` or `misconception` | Asks one Socratic question that sends the student back to their own reasoning — never states or implies the correct answer |

Neither agent is told anything it could use to invent a fact: the
Explainer gets percentages and labels, never raw student text; the
Hint agent is told only a pre-computed weakness *category*
(`procedural` vs `misconception`) plus the student's own words, and
its system prompt explicitly forbids stating the rule or the answer.
This is why the hint stays useful even when the model is wrong about
the specific misconception — it never gets the chance to reveal or
mis-state one.

`app/api/explain` powers the **SESSION SUMMARY** panel on `/report`.
It is given only *already-computed* facts — scores, percentages, the
skill chain, resolved/unresolved status — and asked to phrase them
into a short, warm paragraph in the selected language. It is never
asked to verify, compute, or judge anything mathematical.

Both agents share the same optional, gracefully-degrading contract:

- **No key set** → deterministic, data-driven text instead (templated
  summary on `/report`; a category-keyed Socratic template on
  `/practice`).
- **Key set but the call fails** (bad key, network issue, timeout) →
  same deterministic fallback, silently, with no error shown to the
  user.
- **Key set and working** → genuinely AI-generated text, and on
  `/report` it's labeled "AI-generated" in the UI so it's never
  presented as more authoritative than it is.

Both routes were tested against a live `next dev` server with no
`ANTHROPIC_API_KEY` set — confirmed to return `source: "fallback"`
with a correct, category-matched template every time — see
`.env.example`.

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

## The pages

| Route | Audience | What it shows |
|---|---|---|
| `/` | Student | Landing: the problem, the promise, three steps |
| `/how`, `/about` | Anyone | How it works, project framing (supporting pages) |
| `/diagnostic` | Student | 22 adaptive items, one per screen, no time pressure, no feedback until the end |
| `/skill-map` | Student | Per-skill scores + **ROOT CAUSE IDENTIFIED** with the full prerequisite chain |
| `/practice` | Student | The core innovation: ACTION (what you did) + REASON (why), graded independently, with an optional AI Socratic hint when a reason is scored weak |
| `/retest` | Student | A transfer item — different surface, same underlying misconception, no hints |
| `/report` | Student & teacher | Before/after, ACTION vs REASON split, cited misconception evidence, resolved/unresolved status |
| `/validation` | Judges | The engineering validation harness results — recovery rate, false positives, root-cause accuracy, per-misconception recall table, and an honest **Known Limitations** panel |
| `/topics` | Student | Library of all 28 syllabus topics, foundation to advanced, each showing real item/question counts |
| `/classroom` | Teacher | Demo-labeled class-level view (illustrative data, not a live multi-student backend in this MVP) |

---

## What's inside

```
mathtiba/
├── app/                     Next.js App Router — 7 pages + how/about + 2 API routes
│   ├── api/verify/          equation & expression verification (TS, no external services)
│   ├── api/check-answer/    fraction / percent / LCM-GCF verification (TS)
│   ├── api/explain/         generative agent 1 — session-summary narrative (optional LLM)
│   ├── api/hint/            generative agent 2 — Socratic hint on weak reasoning (optional LLM)
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
├── api/verify-py.py,        SymPy mirror for Vercel Python deploy — file-based
│   api/parser.py            route, auto-detected by Vercel at /api/verify-py
├── harness/
│   ├── simulate.ts          50 simulated students, engineering validation harness
│   ├── test-engines.ts      40 assertions against the math core
│   └── test-pipeline.ts     19 assertions against the full data pipeline
└── vercel.json              configures maxDuration for api/verify-py.py
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
`api/verify-py.py` Python function (see below) deploys alongside it
automatically — Vercel's native Python runtime auto-detects any file
under `api/` as a route (`api/verify-py.py` → `/api/verify-py`), so
`vercel.json` only needs to set `maxDuration`, not a pinned runtime
string. (An earlier version of this repo pointed `vercel.json` at
`engine/verify.py` with `"runtime": "@vercel/python"` — an unversioned
community-runtime string that Vercel now rejects with *"Function
Runtimes must have a valid version"*, since Python moved to a native,
auto-detected runtime. Moving the files into `api/` and dropping the
manual runtime string fixes this.) If you'd rather not enable Python
functions on your Vercel project, it is safe to delete `vercel.json`,
`api/verify-py.py`, `api/parser.py`, and `api/requirements.txt`
entirely; the app uses the TypeScript verifiers by default and
nothing else references them.

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
including on Vercel — no configuration needed. `api/verify-py.py` +
`api/parser.py` are provided as a **mirror implementation using
SymPy**, showing the same verification logic in the Python/SymPy
stack referenced in the original project spec. Vercel auto-detects it
as a native Python function at `/api/verify-py` if you deploy to
Vercel; it is not called by the frontend by default, and nothing
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

- NECTA — Candidates' Item Response Analysis (CIRA), Basic Mathematics
  041, reports 2018-2024, including the CSEE 2022 report explicitly
  documenting the LCM/GCF confusion this project's `NUM-LCM-GCF`
  misconception is built on ("candidates multiplied the given
  fractions by the Greatest Common Factor (GCF) instead of the Lowest
  Common Multiple (LCM)").
- NECTA CSEE 2024 results: 25.35% pass rate in Basic Mathematics ->
  **74.65% failed** (The Citizen, 24 Jan 2025; The Guardian, 23 Jan
  2025 - both citing NECTA Executive Secretary Dr Said Ally Mohamed).
- NECTA CSEE 2025 results (released 31 Jan 2026): 26.45% pass rate ->
  **73.55% failed**, continuing the multi-year pattern (The Citizen,
  1 Feb 2026).
- NECTA FTNA Examination Format 043 Mathematics, 2026.
- Taasisi ya Elimu Tanzania (TIE) - Mathematics Syllabus, Form I-IV,
  2023.
- Payne, S.J. & Squibb, H.R. (1990). "Algebra Mal-Rules and Cognitive
  Accounts of Error." Cognitive Science, 14(3), 445-481.
- Liu, N. et al. (2026). "Misconception Acquisition Dynamics in Large
  Language Models" (MalAlgoLib), building on the Payne & Squibb
  mal-rules taxonomy.
- GPT-4 middle-school algebra misconception benchmark (Warwick
  EduPort/EduFund project summary): 55 misconceptions, 220 diagnostic
  examples, 83.9% detection accuracy when topic-constrained.

---

## License

Built for the Prometheus August AI Challenge 2026.
