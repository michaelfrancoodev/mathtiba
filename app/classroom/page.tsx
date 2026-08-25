"use client";

import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow, StatCell } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const topicRows = [
  { topic: "Fractions", sw: "Sehemu", students: 32, mastered: 18, needsHelp: 8, action: "Equivalent fractions and common denominators" },
  { topic: "Percentages", sw: "Asilimia", students: 28, mastered: 15, needsHelp: 6, action: "Connect percentages to fractions" },
  { topic: "Linear equations", sw: "Linear equations", students: 30, mastered: 21, needsHelp: 4, action: "Balance principle: operate on both sides" },
  { topic: "Algebraic expressions", sw: "Algebraic expressions", students: 26, mastered: 13, needsHelp: 9, action: "Separate like terms from constants" },
];

export default function ClassroomPage() {
  const { locale } = useI18n();
  const sw = locale === "sw";

  return (
    <>
      <TopBar section={sw ? "Dashibodi ya mwalimu" : "Teacher command center"} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-action">Demo class · Form 2</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance">{sw ? "Geuza makosa kuwa hatua ya kufundisha." : "Turn learner errors into the next teaching action."}</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted">{sw ? "Muhtasari huu umetengenezwa kwa data ya demo. Tumia kila insight kupanga remedial lesson, si kuangalia score pekee." : "This seeded classroom view is demo data. Use each insight to plan a remedial lesson, not to read a score in isolation."}</p>
          </div>
          <ButtonLink href="/topics" variant="ghost">{sw ? "Rudi kwenye mada" : "Browse topics"}</ButtonLink>
        </div>

        <div className="mt-8 grid grid-cols-2 divide-x divide-line border-y border-line sm:grid-cols-4">
          <StatCell value="42" label={sw ? "Wanafunzi" : "Learners"} />
          <StatCell value="68%" label={sw ? "Mastery ya mada" : "Topic mastery"} />
          <StatCell value="4" label={sw ? "Mada zenye risk" : "Topics at risk"} />
          <StatCell value="17" label={sw ? "Interventions" : "Actions needed"} />
        </div>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div><Eyebrow>{sw ? "Uchambuzi wa mada" : "Topic intelligence"}</Eyebrow><h2 className="mt-2 text-xl font-semibold">{sw ? "Darasa linahitaji msaada wapi?" : "Where does the class need help?"}</h2></div>
            <span className="font-mono text-[11px] text-muted">DEMO_DATA · NOT A NATIONAL CLAIM</span>
          </div>
          <div className="mt-5 overflow-x-auto border-y border-line">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-panel font-mono text-[10px] uppercase tracking-[0.14em] text-muted"><tr><th className="px-4 py-3">{sw ? "Mada" : "Topic"}</th><th className="px-4 py-3">{sw ? "Wanafunzi" : "Learners"}</th><th className="px-4 py-3">{sw ? "Mastered" : "Mastered"}</th><th className="px-4 py-3">{sw ? "Wanahitaji msaada" : "Needs help"}</th><th className="px-4 py-3">{sw ? "Hatua inayopendekezwa" : "Recommended action"}</th></tr></thead>
              <tbody>{topicRows.map((row) => <tr key={row.topic} className="border-b border-line last:border-0"><td className="px-4 py-4 font-medium">{sw ? row.sw : row.topic}</td><td className="px-4 py-4 font-mono text-muted">{row.students}</td><td className="px-4 py-4 font-mono text-ok">{row.mastered}</td><td className="px-4 py-4 font-mono text-warn">{row.needsHelp}</td><td className="px-4 py-4 text-muted">{row.action}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="border border-line bg-panel p-6"><Eyebrow>{sw ? "Lesson inayofuata" : "Next lesson"}</Eyebrow><h2 className="mt-3 text-xl font-semibold">{sw ? "Equivalent fractions" : "Equivalent fractions"}</h2><p className="mt-3 text-sm leading-relaxed text-muted">{sw ? "Wanafunzi 8 wanaonyesha pattern ya kujumlisha numerator na denominator moja kwa moja. Anza na number line, kisha common denominator." : "Eight learners show a pattern of adding numerators and denominators directly. Start with a number line, then common denominators."}</p><Link href="/practice?topic=FRACTIONS" className="mt-5 inline-block text-sm font-medium text-action hover:underline">{sw ? "Fungua practice →" : "Open targeted practice →"}</Link></div>
          <div className="border border-line p-6"><Eyebrow>{sw ? "Kanuni ya ushahidi" : "Evidence policy"}</Eyebrow><h2 className="mt-3 text-xl font-semibold">{sw ? "Usihitimishe kwa jibu moja." : "Do not conclude from one answer."}</h2><p className="mt-3 text-sm leading-relaxed text-muted">{sw ? "MathTiba huomba ushahidi wa hatua na retest katika context mpya kabla ya kuweka mastery." : "MathTiba requires working evidence and a retest in a new context before marking a skill mastered."}</p><p className="mt-5 font-mono text-[11px] text-muted">{sw ? "SOURCE: content release + teacher review" : "SOURCE: content release + teacher review"}</p></div>
        </section>
      </main>
    </>
  );
}

