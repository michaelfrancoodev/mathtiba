"use client";
import TopBar from "@/components/ui/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { t } = useI18n();
  const steps = [t("home.step1"), t("home.step2"), t("home.step3")];

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted">
          {t("home.eyebrow")}
        </p>

        <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.1] tracking-tight">
          {t("app.tagline")}
        </h1>

        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted">
          {t("home.lead")}
        </p>

        <div className="mt-10 flex items-center gap-5">
          <ButtonLink href="/topics">
            {t("home.cta")}
            <span className="ml-2 opacity-70">· {t("home.ctaMeta")}</span>
          </ButtonLink>
          <ButtonLink href="/how" variant="ghost">
            {t("nav.how")}
          </ButtonLink>
        </div>

        <div className="mt-16 grid grid-cols-3 divide-x divide-line border-y border-line">
          {[
            { v: "74.65%", k: "home.stat1" },
            { v: "22", k: "home.stat2" },
            { v: "8", k: "home.stat3" },
          ].map((s) => (
            <div key={s.k} className="px-5 py-6 first:pl-0">
              <div className="font-mono text-3xl font-semibold">{s.v}</div>
              <div className="mt-1.5 text-xs leading-snug text-muted">{t(s.k)}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {steps.map((label, i) => (
            <div key={label} className="rounded-lg border border-line p-5">
              <span className="font-mono text-xs text-muted">0{i + 1}</span>
              <p className="mt-2 text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>

        <p className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-muted">
          {t("home.footer")}
        </p>
      </main>
    </>
  );
}
