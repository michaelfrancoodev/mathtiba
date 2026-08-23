"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/ui/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";
import { load, save } from "@/lib/storage";
import { scoreSkills, detectMisconceptions, type SkillScore } from "@/lib/misconception-engine";
import { findRootCause, type RootCause } from "@/lib/root-cause";
import type { Attempt } from "@/lib/types";

const WEAK = 50;
const STRONG = 70;

function barColor(p: number) {
  if (p < WEAK) return "bg-err";
  if (p >= STRONG) return "bg-ok";
  return "bg-slate-400";
}

export default function SkillMap() {
  const { t } = useI18n();
  const [scores, setScores] = useState<SkillScore[]>([]);
  const [root, setRoot] = useState<RootCause | null>(null);
  const [topMisconception, setTop] = useState<{ id: string; confidence: number } | null>(null);

  useEffect(() => {
    const attempts = load<Attempt[]>("attempts") ?? [];
    const s = scoreSkills(attempts);
    const r = findRootCause(s);
    const m = detectMisconceptions(attempts)[0] ?? null;

    setScores(s);
    setRoot(r);
    setTop(m ? { id: m.id, confidence: m.confidence } : null);

    save("rootCause", r);
    if (m) save("targetMisconception", m.id);
  }, []);

  if (!root) return null;

  const hasRoot = root.reason === "prerequisite_gap" && root.skillId;

  return (
    <>
      <TopBar section={t("skillMap.title")} />

      <main className="mx-auto max-w-5xl px-6 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">{t("skillMap.heading")}</h1>
        <p className="mt-2 text-sm text-muted">{t("skillMap.sub")}</p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <Eyebrow>{t("skillMap.results")}</Eyebrow>
            <div className="mt-5 space-y-4">
              {scores.map((s) => (
                <div key={s.skill} className="flex items-center gap-4">
                  <span className="w-48 shrink-0 text-sm">{t(`skills.${s.skill}`)}</span>
                  <div className="h-2 flex-1 rounded-sm bg-line">
                    <div
                      className={`h-full rounded-sm ${barColor(s.percent)}`}
                      style={{ width: `${s.percent}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums">
                    {s.percent}%
                  </span>
                </div>
              ))}
              {scores.length === 0 && (
                <p className="text-sm text-muted">{t("skillMap.noWeakness")}</p>
              )}
            </div>
          </section>

          <aside className="rounded-lg border border-line bg-panel p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-err">
              {t("skillMap.rootCause")}
            </p>

            {hasRoot ? (
              <>
                <h2 className="mt-2 text-2xl font-semibold">{t(`skills.${root.skillId}`)}</h2>
                <p className="mt-1 text-xs text-muted">
                  {t("skillMap.prereqOf", { n: Math.max(root.chain.length - 1, 1) })}
                </p>

                <div className="mt-6 space-y-0">
                  {root.chain.map((node, i) => (
                    <div key={node.skillId}>
                      {i > 0 && <div className="ml-[5px] h-5 w-px bg-line" />}
                      <div
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                          i === 0 ? "border border-line bg-white font-medium" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="h-[9px] w-[9px] rounded-full border border-slate-400" />
                          {t(`skills.${node.skillId}`)}
                        </span>
                        <span className="font-mono tabular-nums text-muted">
                          {node.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-6 text-sm leading-relaxed">{t("skillMap.youStartHere")}</p>

                <ButtonLink href="/practice" className="mt-5 w-full">
                  {t("skillMap.startHere")}
                </ButtonLink>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted">{t("skillMap.noWeakness")}</p>
            )}
          </aside>
        </div>

        {topMisconception && (
          <p className="mt-14 border-t border-line pt-5 font-mono text-xs text-muted">
            {t("skillMap.detected")}: {topMisconception.id} · confidence{" "}
            {topMisconception.confidence.toFixed(2)}
          </p>
        )}
      </main>
    </>
  );
}
