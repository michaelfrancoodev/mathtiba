/**
 * Exact rational arithmetic using BigInt. No floating point anywhere.
 * This is the deterministic core the practice/verify APIs rely on —
 * it is plain arithmetic, not an LLM, per the "AI never does math" rule.
 */
export class Fraction {
  readonly n: bigint; // numerator
  readonly d: bigint; // denominator, always > 0

  constructor(n: bigint | number, d: bigint | number = 1n) {
    let nn = typeof n === "number" ? BigInt(Math.round(n)) : n;
    let dd = typeof d === "number" ? BigInt(Math.round(d)) : d;
    if (dd === 0n) throw new Error("division by zero");
    if (dd < 0n) {
      nn = -nn;
      dd = -dd;
    }
    const g = gcdBig(abs(nn), dd) || 1n;
    this.n = nn / g;
    this.d = dd / g;
  }

  add(o: Fraction): Fraction {
    return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o: Fraction): Fraction {
    return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Fraction): Fraction {
    return new Fraction(this.n * o.n, this.d * o.d);
  }
  div(o: Fraction): Fraction {
    if (o.n === 0n) throw new Error("division by zero");
    return new Fraction(this.n * o.d, this.d * o.n);
  }
  eq(o: Fraction): boolean {
    return this.n === o.n && this.d === o.d;
  }
  isInt(): boolean {
    return this.d === 1n;
  }
  toDecimal(): number {
    return Number(this.n) / Number(this.d);
  }
  /** Canonical display: "3/4", "5", "1 1/4" (mixed number) not used — keep improper for exactness in checks. */
  toString(): string {
    if (this.d === 1n) return this.n.toString();
    return `${this.n}/${this.d}`;
  }
}

function abs(x: bigint): bigint {
  return x < 0n ? -x : x;
}

export function gcdBig(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function lcmBig(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  if (a === 0n || b === 0n) return 0n;
  return (a / gcdBig(a, b)) * b;
}

/** Parses "3/4", "1 1/4", "5", "-2/3" into a Fraction. */
export function parseFraction(raw: string): Fraction {
  const s = raw.trim();
  const mixed = s.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = BigInt(mixed[1]);
    const num = BigInt(mixed[2]);
    const den = BigInt(mixed[3]);
    const sign = whole < 0n ? -1n : 1n;
    return new Fraction(whole * den + sign * num, den);
  }
  const frac = s.match(/^(-?\d+)\/(\d+)$/);
  if (frac) return new Fraction(BigInt(frac[1]), BigInt(frac[2]));
  const int = s.match(/^-?\d+$/);
  if (int) return new Fraction(BigInt(s), 1n);
  throw new Error(`cannot parse fraction: "${raw}"`);
}

/** Parses a whitespace-stripped "a op b" fraction expression, e.g. "1/2 + 1/4". */
export function evalFractionExpr(expr: string): Fraction {
  const cleaned = expr.replace(/\s+/g, " ").trim();
  const m = cleaned.match(/^(-?\d+(?:\/\d+)?)\s*([+\-])\s*(-?\d+(?:\/\d+)?)$/);
  if (!m) throw new Error(`unsupported fraction expression: "${expr}"`);
  const a = parseFraction(m[1]);
  const b = parseFraction(m[3]);
  return m[2] === "+" ? a.add(b) : a.sub(b);
}

/** Parses "20% of 250" -> 50, exact via fractions. */
export function evalPercentOf(expr: string): Fraction {
  const m = expr.match(/^(-?\d+(?:\.\d+)?)%\s+of\s+(-?\d+(?:\.\d+)?)$/i);
  if (!m) throw new Error(`unsupported percent expression: "${expr}"`);
  const pct = decimalToFraction(m[1]);
  const base = decimalToFraction(m[2]);
  return pct.div(new Fraction(100n)).mul(base);
}

function decimalToFraction(s: string): Fraction {
  if (!s.includes(".")) return new Fraction(BigInt(s));
  const [whole, frac] = s.split(".");
  const den = 10n ** BigInt(frac.length);
  const sign = whole.startsWith("-") ? -1n : 1n;
  const wholeAbs = BigInt(whole.replace("-", "") || "0");
  const num = sign * (wholeAbs * den + BigInt(frac));
  return new Fraction(num, den);
}

/** Parses "LCM(12, 18)" or "GCF(24, 36)" -> integer result. */
export function evalLcmGcf(expr: string): bigint {
  const m = expr.match(/^(LCM|GCF)\((-?\d+),\s*(-?\d+)\)$/i);
  if (!m) throw new Error(`unsupported LCM/GCF expression: "${expr}"`);
  const a = BigInt(m[2]);
  const b = BigInt(m[3]);
  return m[1].toUpperCase() === "LCM" ? lcmBig(a, b) : gcdBig(a, b);
}
