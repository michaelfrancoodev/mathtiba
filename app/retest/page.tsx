"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { Card, Eyebrow } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";
import { load, save } from "@/lib/storage";
import interventions from "@/data/interventions.json";

type RetestOption = { value: string; correct: boolean; misconception: string | null };
type Retest = {
  id: string;
  kind: "word" | "expr";
  stemKey?: string;
  expr?: string;
  earlier: string;
  options: RetestOption[];
};

const FALLBACK = "EQU-MOVE-FLIP";

export default function ReTest() {
  const { t } = useI18n();
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const bank = interventions as Record<string, { retest: Retest }>;

  useEffect(() => {
    const id = load<string>("targetMisconception") ?? FALLBACK;
    setTarget(bank[id] ? id : FALLBACK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!target) return null;
  const rt = bank[target].retest;
  const stem = rt.kind === "word" && rt.stemKey ? t(rt.stemKey) : rt.expr ?? "";

  function submit() {
    if (selected === null) return;
    const opt = rt.options[selected];
    save("retest", {
      answer: opt.value,
      correct: opt.correct,
      resolved: opt.correct,
    });
    router.push("/report");
  }

  return (
    <>
      <TopBar
        section={t("retest.title")}
        right={<span className="font-mono text-xs text-muted">{target}</span>}
      />

      <div className="border-l-[3px] border-action bg-panel px-6 py-3">
        <p className="mx-auto max-w-3xl text-sm">{t("retest.notice")}</p>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <Card className="p-8">
          <Eyebrow>{t("retest.transferItem")}</Eyebrow>
          <p
            className={`mt-4 ${
              rt.kind === "word" ? "text-lg leading-relaxed" : "font-mono text-2xl"
            }`}
          >
            {stem}
          </p>

          <div className="mt-8 space-y-2.5">
            {rt.options.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => setSelected(i)}
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

          <div className="mt-8 grid grid-cols-2 divide-x divide-line border-t border-line pt-6">
            <div className="pr-5">
              <Eyebrow>{t("retest.earlier")}</Eyebrow>
              <p className="mt-2 font-mono text-sm text-muted">{rt.earlier}</p>
              <p className="mt-1 text-xs text-muted">{t("retest.beforeIntervention")}</p>
            </div>
            <div className="pl-5">
              <Eyebrow>{t("retest.now")}</Eyebrow>
              <div className="mt-2 h-9 rounded-md border border-dashed border-line" />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button onClick={submit} disabled={selected === null}>
              {t("retest.submit")}
            </Button>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">{t("retest.noHints")}</p>
      </main>
    </>
  );
}
