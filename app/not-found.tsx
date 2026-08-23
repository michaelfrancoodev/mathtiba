import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">404</p>
      <h1 className="mt-3 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">
        That route doesn&apos;t exist in MathTiba.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-action px-5 py-2.5 text-sm font-medium text-white"
      >
        Back to home
      </Link>
    </main>
  );
}
