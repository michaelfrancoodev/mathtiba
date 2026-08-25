"use client";
import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, Eyebrow } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";
import { checkCorpusAnswer } from "@/lib/corpus-check";
import corpusData from "@/data/necta-corpus.json";

interface CorpusEntry {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceYear?: number;
  topic: string;
  content: string;
  answer?: string;
  workingNote?: string;
}

export default function CorpusPractice({ topic }: { topic: string }) {
  const { t, locale } = useI18n();
  const entries = useMemo(
    () => (corpusData as CorpusEntry[]).filter((c) => c.topic === topic && c.answer),
    [topic]
  );

  const [index, setIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState<{ correct: boolean; officialAnswer: string } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  useEffect(() => {
    setIndex(0);
    setUserAnswer("");
    setResult(null);
    setCorrectCount(0);
    setAnsweredCount(0);
  }, [topic]);

  if (entries.length === 0) return null;

  const entry = entries[index % entries.length];

  function submit() {
    if (!userAnswer.trim() || !entry.answer) return;
    const check = checkCorpusAnswer(entry.answer, userAnswer);
    setResult({ correct: check.correct, officialAnswer: check.officialAnswer });
    setAnsweredCount((n) => n + 1);
    if (check.correct) setCorrectCount((n) => n + 1);
  }

  function next() {
    setIndex((i) => i + 1);
    setUserAnswer("");
    setResult(null);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <div className="flex items-center justify-between">
        <Eyebrow>
          {locale === "sw" ? "SWALI HALISI LA NECTA" : "REAL NECTA QUESTION"} ·{" "}
          {t(`skills.${topic}`)}
        </Eyebrow>
        <span className="font-mono text-xs text-muted">
          {answeredCount > 0 ? `${correctCount}/${answeredCount}` : `${entries.length} ${locale === "sw" ? "maswali" : "available"}`}
        </span>
      </div>

      <Card className="mt-4 p-8">
        <p className="text-lg leading-relaxed">{entry.content}</p>

        <div className="mt-6 flex gap-2">
          <input
            value={userAnswer}
            onChange={(e) => {
              setUserAnswer(e.target.value);
              setResult(null);
            }}
            placeholder={locale === "sw" ? "jibu lako" : "your answer"}
            className="flex-1 rounded-md border border-line px-3 py-2.5 font-mono text-sm outline-none focus:border-action"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <Button onClick={submit} disabled={!userAnswer.trim()}>
            {locale === "sw" ? "Thibitisha" : "Check"}
          </Button>
        </div>

        {result && (
          <div
            className={`mt-5 rounded-md border px-4 py-3 text-sm ${
              result.correct ? "border-ok bg-ok/5 text-ok" : "border-warn bg-warn/5 text-warn"
            }`}
          >
            {result.correct
              ? locale === "sw"
                ? "Sahihi."
                : "Correct."
              : `${locale === "sw" ? "Jibu rasmi ni" : "Official answer"}: ${result.officialAnswer}`}
            {entry.workingNote && (
              <p className="mt-1 text-xs text-muted">{entry.workingNote}</p>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
          <a
            href={entry.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] text-muted hover:text-action"
          >
            {entry.sourceTitle} {entry.sourceYear ? `(${entry.sourceYear})` : ""} ↗
          </a>
          <button
            onClick={next}
            className="text-sm font-medium text-action hover:underline"
          >
            {locale === "sw" ? "Swali linalofuata →" : "Next question →"}
          </button>
        </div>
      </Card>

      <p className="mt-6 text-center text-xs text-muted">
        {locale === "sw"
          ? "Swali hili ni nakala halisi kutoka karatasi ya mtihani wa NECTA — si lililobuniwa."
          : "This question is transcribed verbatim from an official NECTA exam paper — not synthetically generated."}
      </p>

      <div className="mt-8 text-center">
        <ButtonLink href="/topics" variant="ghost">
          {locale === "sw" ? "Rudi kwenye mada" : "Back to topics"}
        </ButtonLink>
      </div>
    </main>
  );
}
