"use client";
import Link from "next/link";

type Variant = "primary" | "ghost";

const BASE =
  "inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-action text-white hover:bg-blue-800",
  ghost: "border border-line bg-white text-muted hover:text-ink",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}
