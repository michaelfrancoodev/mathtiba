"use client";
import TopBar from "@/components/ui/TopBar";
import { Card, Eyebrow } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

export default function About() {
  const { t } = useI18n();

  return (
    <>
      <TopBar section={t("nav.about")} />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{t("home.aboutTitle")}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{t("home.aboutBody")}</p>

        <Card className="mt-10 border-l-[3px] border-action bg-panel p-6">
          <Eyebrow>Architecture principle</Eyebrow>
          <p className="mt-2 text-sm leading-relaxed">{t("home.aboutPrinciple")}</p>
        </Card>

        <p className="mt-10 text-xs leading-relaxed text-muted">{t("home.footer")}</p>
      </main>
    </>
  );
}
