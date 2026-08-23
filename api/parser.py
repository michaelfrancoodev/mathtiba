"""Convert a pedagogical action into a symbolic transformation."""
from sympy import Eq, sympify, simplify, expand, collect, Symbol

x = Symbol("x")

ALLOWED = {"subtract", "add", "divide", "multiply", "collect", "expand"}


def parse_equation(text: str) -> Eq:
    """'3*x + 5 = 20' -> Eq(3*x + 5, 20)"""
    if "=" not in text:
        raise ValueError("not an equation")
    lhs, rhs = text.split("=", 1)
    return Eq(sympify(lhs.strip()), sympify(rhs.strip()))


def apply_action(eq: Eq, op: str, value=None) -> Eq:
    """Apply the operation to BOTH sides. This is the whole point."""
    if op not in ALLOWED:
        raise ValueError(f"unsupported action: {op}")

    if op == "subtract":
        v = sympify(value)
        return Eq(eq.lhs - v, eq.rhs - v)

    if op == "add":
        v = sympify(value)
        return Eq(eq.lhs + v, eq.rhs + v)

    if op == "divide":
        v = sympify(value)
        if v == 0:
            raise ValueError("division by zero")
        return Eq(eq.lhs / v, eq.rhs / v)

    if op == "multiply":
        v = sympify(value)
        return Eq(eq.lhs * v, eq.rhs * v)

    if op == "collect":
        return Eq(collect(expand(eq.lhs), x), collect(expand(eq.rhs), x))

    if op == "expand":
        return Eq(expand(eq.lhs), expand(eq.rhs))

    raise ValueError("unreachable")


def equivalent(a: Eq, b: Eq) -> bool:
    """Do these two equations have the same solution set?"""
    return simplify((a.lhs - a.rhs) - (b.lhs - b.rhs)) == 0


def is_solved(eq: Eq) -> bool:
    """x = number"""
    return eq.lhs == x and eq.rhs.is_number


def pretty(eq: Eq) -> str:
    return f"{eq.lhs} = {eq.rhs}"
