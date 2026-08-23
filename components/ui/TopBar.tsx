"use client";
import Link from "next/link";
import LocaleSwitch from "./LocaleSwitch";
import { useI18n } from "@/lib/i18n";

export default function TopBar({
  section,
  right,
}: {
  section?: string;
  right?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-6">
        <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
          MATHTIBA
        </Link>
        {section && (
          <>
            <span className="h-4 w-px bg-line" />
            <span className="text-xs font-medium tracking-[0.12em] text-muted">
              {section}
            </span>
          </>
        )}
        <nav className="ml-6 hidden items-center gap-5 text-xs text-muted sm:flex">
          <Link href="/how" className="hover:text-ink">
            {t("nav.how")}
          </Link>
          <Link href="/validation" className="hover:text-ink">
            {t("nav.validation")}
          </Link>
          <Link href="/about" className="hover:text-ink">
            {t("nav.about")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          {right}
          <LocaleSwitch />
        </div>
      </div>
    </header>
  );
}
