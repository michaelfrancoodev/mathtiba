"use client";
import { useI18n, LOCALES, type Locale } from "@/lib/i18n";

const LABEL: Record<Locale, string> = { en: "EN", sw: "SW" };

export default function LocaleSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex rounded-md border border-line overflow-hidden"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`px-2.5 py-1 text-xs font-medium tracking-wide transition-colors ${
            locale === l
              ? "bg-ink text-white"
              : "bg-white text-muted hover:text-ink"
          }`}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
