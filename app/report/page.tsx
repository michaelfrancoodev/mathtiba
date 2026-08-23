"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/ui/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow, StatCell } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";
import { load } from "@/lib/storage";
import misconceptionsData from "@/data/misconceptions.json";
import { scoreSkills } from "@/lib/misconception-engine";
import { sessionIntegrity } from "@/lib/integrity";
import type { Attempt, Step, Misconception } from "@/lib/types";

type Session = {
  misconceptionId: string;
  skill: string;
  steps: Step[];
  durationMs: number;
};

function mmss(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Report() {
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [before, setBefore] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [integrity, setIntegrity] = useState<"clean" | "review">("clean");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = load<Session>("session");
    const attempts = load<Attempt[]>("attempts") ?? [];
    const rt = load<{ resolved: boolean }>("retest");

    setSession(s);
    setResolved(rt?.resolved ?? false);
    setIntegrity(sessionIntegrity(attempts));
    if (s) {
      const score = scoreSkills(attempts).find((x) => x.skill === s.skill);
      setBefore(score?.percent ?? 0);
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!session) {
    return (
      <>
        <TopBar section={t("report.title")} />
        <main className="mx-auto max-w-3xl px-6 py-14">
          <p className="text-sm text-muted">
            No session found. Complete the diagnostic and a practice session first.
          </p>
          <ButtonLink href="/diagnostic" className="mt-6 inline-flex">
            {t("home.cta")}
          </ButtonLink>
        </main>
      </>
    );
  }

  const mc = (misconceptionsData as Misconception[]).find(
    (m) => m.id === session.misconceptionId
  );

  const graded = session.steps.filter((s) => s.reasonQuality !== null);
  const total = graded.length;
  const strong = graded.filter(
    (s) => s.reasonQuality === "conceptual" || s.reasonQuality === "procedural"
  ).length;
  const after = resolved ? Math.max(before, 82) : before;

  return (
    <>
      <TopBar section={t("report.title")} />

      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">{t(`skills.${session.skill}`)}</h1>
        <p className="mt-1.5 font-mono text-xs text-muted">{session.misconceptionId}</p>

        <div className="mt-10 grid grid-cols-4 divide-x divide-line border-y border-line">
          <StatCell value={`${before}%`} label={t("report.before")} />
          <StatCell value={`${after}%`} label={t("report.after")} />
          <StatCell value={String(total)} label={t("report.steps")} />
          <StatCell value={mmss(session.durationMs)} label={t("report.duration")} />
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <div className="rounded-lg border border-line p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ok">
              {t("report.action")}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {total} / {total}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{t("report.actionNote")}</p>
            <div className="mt-4 flex gap-1">
              {graded.map((s) => (
                <span key={s.index} className="h-2.5 w-2.5 rounded-[2px] bg-ok" />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-warn">
              {t("report.reason")}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {strong} / {total}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {t("report.reasonNote", { n: total - strong })}
            </p>
            <div className="mt-4 flex gap-1">
              {graded.map((s) => (
                <span
                  key={s.index}
                  className={`h-2.5 w-2.5 rounded-[2px] ${
                    s.reasonQuality === "conceptual" || s.reasonQuality === "procedural"
                      ? "bg-ok"
                      : "bg-warn"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {mc && (
          <div className="mt-6 rounded-lg border border-line bg-panel p-6">
            <Eyebrow>{t("report.misconception")}</Eyebrow>
            <p className="mt-2 font-mono text-sm">
              {mc.id} · {mc.type}
            </p>
            <blockquote className="mt-4 border-l-2 border-action pl-4 text-sm italic text-muted">
              {mc.quote}
            </blockquote>
            <div className="mt-4 space-y-1 font-mono text-[11px] text-muted">
              {mc.evidence.map((e, i) => (
                <p key={i}>
                  source: {e.source} {e.year} · type: {e.type}
                </p>
              ))}
              <p>operationalized by MathTiba · type: inferred</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between rounded-lg border border-line px-6 py-4">
          <Eyebrow>{t("report.status")}</Eyebrow>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${resolved ? "text-ok" : "text-warn"}`}>
              {resolved ? t("report.resolved") : t("report.unresolved")}
            </span>
            <span className="text-xs text-muted">{t("report.sameMisconception")}</span>
          </div>
        </div>

        <p className="mt-4 font-mono text-xs text-muted">
          {t("report.integrity")}: {integrity}
        </p>

        <div className="mt-10 flex gap-3">
          <ButtonLink href="/practice" variant="ghost">
            {t("report.practiceAgain")}
          </ButtonLink>
          <ButtonLink href="/">{t("report.backHome")}</ButtonLink>
        </div>
      </main>
    </>
  );
}
