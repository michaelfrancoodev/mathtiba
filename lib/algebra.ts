import { Fraction } from "./fraction";

export interface LinearExpr {
  varName: string | null; // null if the expression is a pure constant
  coeff: Fraction; // coefficient of the variable (0 if varName is null)
  constant: Fraction;
}

export interface LinearEquation {
  varName: string;
  lhs: LinearExpr;
  rhs: LinearExpr;
}

/** Splits "5y + 2y - 3" into signed terms ["+5y", "+2y", "-3"]. */
function splitTerms(expr: string): string[] {
  const cleaned = expr.replace(/\s+/g, "");
  const terms: string[] = [];
  let current = "";
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if ((c === "+" || c === "-") && i > 0) {
      terms.push(current);
      current = c;
    } else if ((c === "+" || c === "-") && i === 0) {
      current = c;
    } else {
      current += c;
    }
  }
  if (current) terms.push(current);
  return terms.length ? terms : [cleaned];
}

/** Parses a linear expression like "3x + 4", "-2/3x", "7", "-a - b" into varName/coeff/constant. */
export function parseLinearExpr(expr: string): LinearExpr {
  const terms = splitTerms(expr);
  let varName: string | null = null;
  let coeff = new Fraction(0n);
  let constant = new Fraction(0n);

  for (const raw of terms) {
    let term = raw;
    let sign = 1n;
    if (term.startsWith("+")) term = term.slice(1);
    else if (term.startsWith("-")) {
      sign = -1n;
      term = term.slice(1);
    }
    if (term === "") continue;

    const varMatch = term.match(/^(\d+(?:\/\d+)?)?([a-zA-Z])$/);
    if (varMatch) {
      const magnitude = varMatch[1] ? parseCoeffMagnitude(varMatch[1]) : new Fraction(1n);
      const letter = varMatch[2];
      if (varName && varName !== letter) {
        throw new Error(`multiple variables not supported: ${varName}, ${letter}`);
      }
      varName = letter;
      coeff = coeff.add(new Fraction(sign).mul(magnitude));
      continue;
    }

    const constMatch = term.match(/^\d+(?:\/\d+)?$/);
    if (constMatch) {
      constant = constant.add(new Fraction(sign).mul(parseCoeffMagnitude(term)));
      continue;
    }

    throw new Error(`cannot parse term: "${raw}" in "${expr}"`);
  }

  return { varName, coeff, constant };
}

function parseCoeffMagnitude(s: string): Fraction {
  if (s.includes("/")) {
    const [n, d] = s.split("/");
    return new Fraction(BigInt(n), BigInt(d));
  }
  return new Fraction(BigInt(s));
}

/** Formats a LinearExpr back into canonical display form, e.g. "3x + 12", "-a - b", "5". */
export function formatLinearExpr(e: LinearExpr): string {
  const parts: string[] = [];
  if (e.varName && e.coeff.n !== 0n) {
    const c = e.coeff;
    let piece: string;
    if (c.eq(new Fraction(1n))) piece = e.varName;
    else if (c.eq(new Fraction(-1n))) piece = `-${e.varName}`;
    else piece = `${c.toString()}${e.varName}`;
    parts.push(piece);
  }
  if (e.constant.n !== 0n || parts.length === 0) {
    const c = e.constant;
    if (parts.length === 0) {
      parts.push(c.toString());
    } else {
      parts.push(c.n < 0n ? `- ${new Fraction(-c.n, c.d).toString()}` : `+ ${c.toString()}`);
    }
  }
  return parts.join(" ");
}

/** Parses "3x + 5 = 20" into a LinearEquation. Both sides must share the same variable (or one side constant). */
export function parseEquation(text: string): LinearEquation {
  if (!text.includes("=")) throw new Error("not an equation");
  const [lhsRaw, rhsRaw] = text.split("=");
  const lhs = parseLinearExpr(lhsRaw);
  const rhs = parseLinearExpr(rhsRaw);
  const varName = lhs.varName ?? rhs.varName;
  if (!varName) throw new Error("equation has no variable");
  return { varName, lhs, rhs };
}

export function formatEquation(eq: LinearEquation): string {
  return `${formatLinearExpr(eq.lhs)} = ${formatLinearExpr(eq.rhs)}`;
}

export type EquationOp = "subtract" | "add" | "divide" | "multiply";

/** Apply the same operation to BOTH sides — this is the entire pedagogical point. */
export function applyEquationAction(
  eq: LinearEquation,
  op: EquationOp,
  value: Fraction
): LinearEquation {
  function transform(e: LinearExpr): LinearExpr {
    switch (op) {
      case "subtract":
        return { ...e, constant: e.constant.sub(value) };
      case "add":
        return { ...e, constant: e.constant.add(value) };
      case "divide":
        if (value.n === 0n) throw new Error("division by zero");
        return { ...e, coeff: e.coeff.div(value), constant: e.constant.div(value) };
      case "multiply":
        return { ...e, coeff: e.coeff.mul(value), constant: e.constant.mul(value) };
    }
  }
  return { varName: eq.varName, lhs: transform(eq.lhs), rhs: transform(eq.rhs) };
}

export function equationEquivalent(a: LinearEquation, b: LinearEquation): boolean {
  const aCoeff = a.lhs.coeff.sub(a.rhs.coeff);
  const aConst = a.lhs.constant.sub(a.rhs.constant);
  const bCoeff = b.lhs.coeff.sub(b.rhs.coeff);
  const bConst = b.lhs.constant.sub(b.rhs.constant);
  if (aCoeff.n === 0n && bCoeff.n === 0n) return aConst.eq(bConst);
  if (aCoeff.n === 0n || bCoeff.n === 0n) return false;
  // root_a = -aConst/aCoeff ; root_b = -bConst/bCoeff — same root => same solution set
  const rootA = aConst.mul(new Fraction(-1n)).div(aCoeff);
  const rootB = bConst.mul(new Fraction(-1n)).div(bCoeff);
  return rootA.eq(rootB);
}

export function equationIsSolved(eq: LinearEquation): boolean {
  return (
    eq.lhs.varName === eq.varName &&
    eq.lhs.coeff.eq(new Fraction(1n)) &&
    eq.lhs.constant.n === 0n &&
    eq.rhs.varName === null
  );
}

/** Expand "3(x + 4)" / "-(a + b)" / "-2(x - 3)" -> LinearExpr. */
export function expandBracket(expr: string): LinearExpr {
  const cleaned = expr.replace(/\s+/g, "");
  const m = cleaned.match(/^(-?\d*)\(([a-zA-Z])([+-])(\d+)\)$/);
  if (!m) throw new Error(`unsupported bracket expression: "${expr}"`);
  const coeffStr = m[1];
  const varName = m[2];
  const innerSign = m[3] === "+" ? 1n : -1n;
  const innerConst = BigInt(m[4]);

  let k: Fraction;
  if (coeffStr === "") k = new Fraction(1n);
  else if (coeffStr === "-") k = new Fraction(-1n);
  else k = new Fraction(BigInt(coeffStr));

  return {
    varName,
    coeff: k,
    constant: k.mul(new Fraction(innerSign * innerConst)),
  };
}

/** Collect like terms in a plain (non-equation) linear expression — identity if already collected. */
export function collectExpr(expr: string): LinearExpr {
  return parseLinearExpr(expr);
}

export function linearExprEquivalent(a: LinearExpr, b: LinearExpr): boolean {
  const aVar = a.varName ?? "";
  const bVar = b.varName ?? "";
  if (aVar !== bVar && a.coeff.n !== 0n && b.coeff.n !== 0n) return false;
  return a.coeff.eq(b.coeff) && a.constant.eq(b.constant);
}
