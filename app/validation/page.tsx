"use client";
import TopBar from "@/components/ui/TopBar";
import { Eyebrow } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";
import results from "@/harness/results.json";

type Row = { id: string; injected: number; detected: number; recall: number };

export default function Validation() {
  const { t } = useI18n();
  const r = results as {
    students: number;
    recoveryRate: number;
    falsePositiveRate: number;
    rootCauseAccuracy: number;
    medianItemsToDetection: number;
    perMisconception: Row[];
  };

  const metrics = [
    { label: t("validation.recovery"), value: `${r.recoveryRate}%` },
    { label: t("validation.falsePositives"), value: `${r.falsePositiveRate}%` },
    { label: t("validation.rootAccuracy"), value: `${r.rootCauseAccuracy}%` },
    { label: t("validation.itemsToDetection"), value: String(r.medianItemsToDetection) },
  ];

  const limitations = [
    "No classroom trial has been conducted.",
    "Simulated response noise fixed at 8 percent.",
    "Procedural slips are excluded from the model by design.",
    "Simulated students have no anxiety, fatigue or shifting motivation.",
  ];

  return (
    <>
      <TopBar
        section={t("validation.title")}
        right={
          <span className="font-mono text-xs text-muted">
            harness v0.1 · n={r.students}
          </span>
        }
      />

      <main className="mx-auto max-w-5xl px-6 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">{t("validation.heading")}</h1>

        <div className="mt-8 border-l-[3px] border-action bg-panel px-5 py-4">
          <p className="text-sm">{t("validation.notice")}</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-line p-6">
              <Eyebrow>{m.label}</Eyebrow>
              <p className="mt-3 font-mono text-4xl font-semibold tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>

        <Eyebrow>
          <span className="mt-12 block">{t("validation.tableTitle")}</span>
        </Eyebrow>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-y border-line text-left">
              {["MISCONCEPTION", "INJECTED", "DETECTED", "RECALL"].map((h) => (
                <th
                  key={h}
                  className="py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {r.perMisconception.map((row) => (
              <tr key={row.id} className="border-b border-line">
                <td className="py-3 font-mono text-[13px]">{row.id}</td>
                <td className="py-3 font-mono tabular-nums">{row.injected}</td>
                <td className="py-3 font-mono tabular-nums">{row.detected}</td>
                <td
                  className={`py-3 font-mono tabular-nums ${
                    row.recall >= 80 ? "text-ok" : "text-warn"
                  }`}
                >
                  {row.recall}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 rounded-lg border border-line bg-panel p-6">
          <Eyebrow>{t("validation.limitations")}</Eyebrow>
          <ul className="mt-3 space-y-1.5">
            {limitations.map((l) => (
              <li key={l} className="text-sm text-muted">
                {l}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
