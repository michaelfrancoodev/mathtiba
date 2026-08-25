"use client";

import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import items from "@/data/items.json";
import curriculum from "@/data/curriculum.json";
import type { Skill } from "@/lib/types";

const topicDescriptionKey = (id: string) => `topicDescriptions.${id}`;

export default function TopicsPage() {
  const { t, locale } = useI18n();
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.skill] = (counts[item.skill] ?? 0) + 1;
  }

  const graph = curriculum as Skill[];
  const sorted = [...graph].sort((a, b) => a.level - b.level || a.form - b.form);

  return (
    <>
      <TopBar section={locale === "sw" ? "Mada zote" : "Topic library"} />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-action">
            {locale === "sw" ? "SILABASI KAMILI · NECTA" : "FULL SYLLABUS · NECTA-ALIGNED"}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {locale === "sw"
              ? "Chagua mada unayotaka kuelewa."
              : "Choose the topic you want to master."}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted">
            {locale === "sw"
              ? `Mada ${graph.length} zilizopangwa kutoka msingi hadi juu, zikifuata mahitaji ya awali halisi ya silabasi.`
              : `${graph.length} topics ordered from foundation to advanced, following the syllabus's real prerequisite structure.`}
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((topic) => {
            const count = counts[topic.id] ?? 0;
            return (
              <article
                key={topic.id}
                className="flex min-h-56 flex-col border border-line bg-panel p-6 transition-colors hover:border-action"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-xs text-muted">FORM {topic.form}</span>
                  <span className="font-mono text-xs text-action">
                    {count} {locale === "sw" ? "maswali" : "items"}
                  </span>
                </div>
                <h2 className="mt-8 text-xl font-semibold">{t(`skills.${topic.id}`)}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {t(topicDescriptionKey(topic.id))}
                </p>
                <div className="mt-auto flex items-center justify-between pt-6">
                  <span className="text-xs text-muted">
                    {topic.prerequisites.length
                      ? topic.prerequisites.map((p) => t(`skills.${p}`)).join(", ")
                      : locale === "sw"
                        ? "Mada ya msingi"
                        : "Foundation topic"}
                  </span>
                  {count > 0 ? (
                    <ButtonLink
                      href={`/practice?topic=${topic.id}`}
                      variant="ghost"
                      className="px-0 text-action"
                    >
                      {locale === "sw" ? "Anza" : "Start"} <span aria-hidden="true">&rarr;</span>
                    </ButtonLink>
                  ) : (
                    <span className="text-xs text-muted">
                      {locale === "sw" ? "Maudhui yanapitiwa" : "Content under review"}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <section className="mt-14 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              {locale === "sw" ? "Unataka picha ya uwezo wako?" : "Want a complete baseline?"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {locale === "sw"
                ? "Fanya uchunguzi wa mada kadhaa kwa mpangilio mmoja."
                : "Run a structured assessment across the foundational sequence."}
            </p>
          </div>
          <Link href="/diagnostic" className="text-sm font-medium text-action hover:underline">
            {locale === "sw" ? "Fanya uchunguzi →" : "Take assessment →"}
          </Link>
        </section>
      </main>
    </>
  );
}
