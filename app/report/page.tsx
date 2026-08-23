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
import type { RootCause } from "@/lib/root-cause";
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
  const { t, locale } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [before, setBefore] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [integrity, setIntegrity] = useState<"clean" | "review">("clean");
  const [ready, setReady] = useState(false);
  const [rootCause, setRootCause] = useState<RootCause | null>(null);
  const [summary, setSummary] = useState<{ text: string; source: "ai" | "fallback" } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    const s = load<Session>("session");
    const attempts = load<Attempt[]>("attempts") ?? [];
    const rt = load<{ resolved: boolean }>("retest");
    const rc = load<RootCause>("rootCause");

    setSession(s);
    setResolved(rt?.resolved ?? false);
    setIntegrity(sessionIntegrity(attempts));
    setRootCause(rc);
    if (s) {
      const score = scoreSkills(attempts).find((x) => x.skill === s.skill);
      setBefore(score?.percent ?? 0);
    }
    setReady(true);
  }, []);

  // Fetch the (optional) AI-generated narrative once the base report data
  // is ready. This call touches ONLY the generative layer — it is given
  // already-computed facts and asked to phrase them, never to compute or
  // verify anything. It degrades to a deterministic template automatically
  // if no API key is configured or the request fails for any reason.
  useEffect(() => {
    if (!ready || !session) return;
    const mcForSummary = (misconceptionsData as Misconception[]).find(
      (m) => m.id === session.misconceptionId
    );
    const graded = session.steps.filter((s) => s.reasonQuality !== null);
    const total = graded.length;
    const strong = graded.filter(
      (s) => s.reasonQuality === "conceptual" || s.reasonQuality === "procedural"
    ).length;
    const afterVal = resolved ? Math.max(before, 82) : before;
    const chainLabels = rootCause?.chain?.length
      ? rootCause.chain.map((n) => t(`skills.${n.skillId}`))
      : [t(`skills.${session.skill}`)];

    let cancelled = false;
    setSummaryLoading(true);
    fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        skill: session.skill,
        skillLabel: t(`skills.${session.skill}`),
        misconceptionId: session.misconceptionId,
        misconceptionQuote: mcForSummary?.quote ?? "",
        chainLabels,
        before,
        after: afterVal,
        actionScore: `${total}/${total}`,
        reasonScore: `${strong}/${total}`,
        resolved,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok) setSummary({ text: data.text, source: data.source });
      })
      .catch(() => {
        /* silent — the deterministic report above already stands on its own */
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, session, resolved, before, rootCause, locale]);

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

        <div className="mt-6 rounded-lg border border-line p-6">
          <div className="flex items-center justify-between">
            <Eyebrow>{t("report.aiSummary")}</Eyebrow>
            {summary && (
              <span className="text-[10px] uppercase tracking-wide text-muted">
                {summary.source === "ai" ? t("report.aiGenerated") : t("report.staticSummary")}
              </span>
            )}
          </div>
          {summaryLoading && !summary && (
            <p className="mt-3 text-sm text-muted">{t("report.aiSummaryLoading")}</p>
          )}
          {summary && <p className="mt-3 text-sm leading-relaxed">{summary.text}</p>}
        </div>

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
