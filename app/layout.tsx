import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "MathTiba — We find the misconception, not the score",
  description:
    "MathTiba identifies the misconception beneath a student's failure, traces it to the prerequisite gap that caused it, and measures whether it is actually gone.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-bg text-ink">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
