export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border border-line bg-white ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
      {children}
    </p>
  );
}

export function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-5 py-6 first:pl-0">
      <div className="font-mono text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1.5 text-xs leading-snug text-muted">{label}</div>
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1 w-full bg-line" role="progressbar" aria-valuenow={value}>
      <div
        className="h-full bg-action transition-[width] duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
