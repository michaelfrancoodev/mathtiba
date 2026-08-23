"use client";
import TopBar from "@/components/ui/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Card, Eyebrow } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

export default function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { title: t("home.howStep1Title"), body: t("home.howStep1Body") },
    { title: t("home.howStep2Title"), body: t("home.howStep2Body") },
    { title: t("home.howStep3Title"), body: t("home.howStep3Body") },
  ];

  return (
    <>
      <TopBar section={t("nav.how")} />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{t("home.howTitle")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{t("home.howLead")}</p>

        <div className="mt-10 space-y-5">
          {steps.map((s, i) => (
            <Card key={s.title} className="p-6">
              <Eyebrow>0{i + 1}</Eyebrow>
              <h2 className="mt-2 text-lg font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-10">
          <ButtonLink href="/diagnostic">{t("home.cta")}</ButtonLink>
        </div>
      </main>
    </>
  );
}
