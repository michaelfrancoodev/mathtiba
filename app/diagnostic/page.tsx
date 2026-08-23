"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { Card, Eyebrow, Progress } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";
import { nextItem, getItem, TOTAL_ITEMS } from "@/lib/diagnostic-engine";
import { assessAttempt } from "@/lib/integrity";
import { save } from "@/lib/storage";
import type { Attempt } from "@/lib/types";

export default function Diagnostic() {
  const { t } = useI18n();
  const router = useRouter();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [itemId, setItemId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [changes, setChanges] = useState(0);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    setItemId(nextItem([]));
  }, []);

  const item = useMemo(() => (itemId ? getItem(itemId) : null), [itemId]);

  const consecutiveWrong = useMemo(() => {
    let n = 0;
    for (let i = attempts.length - 1; i >= 0; i--) {
      if (attempts[i].correct) break;
      n++;
    }
    return n;
  }, [attempts]);

  function choose(index: number) {
    if (selected !== null && selected !== index) setChanges((c) => c + 1);
    setSelected(index);
  }

  function commit(skipped: boolean) {
    if (!item) return;
    if (!skipped && selected === null) return;

    const option = skipped ? null : item.options[selected as number];
    const elapsed = Date.now() - startedAt.current;
    const { flag } = assessAttempt(elapsed, changes, consecutiveWrong);

    const attempt: Attempt = {
      itemId: item.id,
      skill: item.skill,
      answer: option ? option.value : "SKIPPED",
      correct: option ? option.correct : false,
      // A skipped item is honest — it must never count as a misconception.
      misconceptionId: option && !option.correct ? option.misconception : null,
      responseTimeMs: elapsed,
      changes,
      integrityFlag: skipped ? null : flag,
    };

    const updated = [...attempts, attempt];
    setAttempts(updated);

    const next = nextItem(updated);
    if (next) {
      setItemId(next);
      setSelected(null);
      setChanges(0);
      startedAt.current = Date.now();
    } else {
      save("attempts", updated);
      router.push("/skill-map");
    }
  }

  if (!item) return null;

  const answered = attempts.length;
  const stem = item.kind === "word" ? t(item.stemKey!) : item.expr!;

  return (
    <>
      <TopBar
        section={t("diagnostic.title")}
        right={
          <span className="font-mono text-xs text-muted">
            {t("diagnostic.counter", { current: answered + 1, total: TOTAL_ITEMS })}
          </span>
        }
      />
      <Progress value={(answered / TOTAL_ITEMS) * 100} />

      <main className="mx-auto max-w-3xl px-6 py-14">
        <Card className="p-8">
          <div className="flex items-start justify-between">
            <Eyebrow>{t(`skills.${item.skill}`)}</Eyebrow>
          </div>

          <p
            className={`mt-6 ${
              item.kind === "word" ? "text-lg leading-relaxed" : "font-mono text-3xl"
            }`}
          >
            {stem}
          </p>

          <div className="mt-8 space-y-2.5">
            {item.options.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => choose(i)}
                className={`flex w-full items-center gap-3 rounded-md border px-4 py-3.5 text-left transition-colors ${
                  selected === i ? "border-ink" : "border-line hover:border-slate-300"
                }`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded border border-line font-mono text-xs text-muted">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="font-mono text-[15px]">{opt.value}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => commit(true)}
            className="mt-5 rounded-md border border-line px-4 py-2 text-sm text-muted hover:text-ink"
          >
            {t("diagnostic.notSure")}
          </button>

          <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
            <p className="text-xs italic text-muted">{t("diagnostic.noPressure")}</p>
            <Button onClick={() => commit(false)} disabled={selected === null}>
              {t("diagnostic.continue")}
            </Button>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">{t("diagnostic.resultsLater")}</p>
      </main>
    </>
  );
}
