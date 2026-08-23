# Contributing to MathTiba

This is an MVP built for the Prometheus August AI Challenge (August
2026). Contributions, forks, and adaptations are welcome after the
challenge concludes.

## Local setup

```bash
npm install
npm run dev
```

## Before opening a PR

```bash
npx tsc --noEmit   # strict TypeScript, must be clean
npm run lint       # ESLint, must be clean
npm test           # 40 math-engine + 19 pipeline assertions, must pass
npm run build      # production build, must succeed
```

All four are also run automatically by CI (`.github/workflows/ci.yml`)
on every push and pull request.

## Adding a new misconception

1. Add an entry to `data/misconceptions.json` (id, skill, prerequisite,
   type, evidence, quote, observable_patterns, diagnostic_items,
   intervention, mastery_rule).
2. Add at least 2 diagnostic items to `data/items.json` whose
   distractors reference the new misconception id.
3. Add an entry to `data/interventions.json` with a `mode`
   (`"equation"`, `"expression"`, or `"arithmetic"`), 2–3 practice
   tasks, and a `retest` transfer item.
4. Add English + Swahili translations for any new `stemKey`s in
   `lib/i18n/en.json` / `lib/i18n/sw.json`.
5. Run `npm test` — `harness/test-pipeline.ts` checks structural
   consistency (every item distractor resolves to a real misconception
   id, every interventions.json key matches a real misconception id).
