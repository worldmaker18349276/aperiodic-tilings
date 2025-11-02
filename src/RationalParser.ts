
import * as Rational from "./Rational.js";


function parseFloatAsRational(input: string): Rational.Rational {
  const m = input.match(/^(\d+)(?:\.(\d+))?$/)!;
  const [_, int, frac = ""] = m;
  let numerator = BigInt(int + frac);
  let denominator = 10n ** BigInt(frac.length);
  return Rational.make(numerator, denominator);
}

export function parseRationalExpr(input: string): Rational.Rational {
  const tokens: string[] = [];
  const re = /\s*([0-9]+(?:\.[0-9]+)?|[()+\-*/])\s*/g;
  let m;
  while (m = re.exec(input)) {
    tokens.push(m[1]!);
  }
  tokens.push("");

  let i = 0;
  const peek = () => tokens[i]!;
  const next = () => i++;

  function parsePrimary(): Rational.Rational {
    if (peek() === "(") {
      next();
      const expr = parseAddSub();
      if (peek() !== ")") throw new Error("Expected ')'");
      next();
      return expr;
    }
    let is_neg = false;
    if (peek() === "+" || peek() === "-") {
      is_neg = peek() === "-";
      next();
    }
    if (/^[0-9]+/.test(peek())) {
      let value = parseFloatAsRational(peek());
      value = is_neg ? Rational.neg(value) : value;
      next();
      return value;
    }
    throw new Error("Unexpected token: " + peek());
  }

  function parseMulDiv(): Rational.Rational {
    let lhs = parsePrimary();
    while (peek() === "*" || peek() === "/") {
      if (peek() === "*") {
        next();
        const rhs = parsePrimary();
        lhs = Rational.mul(lhs, rhs);
      } else if (peek() === "/") {
        next();
        const rhs = parsePrimary();
        lhs = Rational.mul(lhs, Rational.inv(rhs));
      }
    }
    return lhs;
  }

  function parseAddSub(): Rational.Rational {
    let lhs = parseMulDiv();
    while (peek() === "+" || peek() === "-") {
      if (peek() === "+") {
        next();
        const rhs = parseMulDiv();
        lhs = Rational.add(lhs, rhs);
      } else if (peek() === "-") {
        next();
        const rhs = parseMulDiv();
        lhs = Rational.add(lhs, Rational.neg(rhs));
      }
    }
    return lhs;
  }

  const ast = parseAddSub();
  if (peek() !== "") throw new Error("Unexpected extra tokens");
  return ast;
}

export function formatRational(value: Rational.Rational): string {
  const is_neg = value.numerator < 0n;
  const value_abs = is_neg ? Rational.neg(value) : value;
  const value_i = `${Rational.integer(value_abs)}`;
  const value_f = Rational.toString(Rational.fractional(value_abs));
  let res = "";
  if (value_i !== "0") {
    res += (is_neg ? "-" : "") + value_i;
  }
  if (value_f !== "0/1") {
    res += (is_neg ? "-" : res !== "" ? "+" : "") + value_f;
  }
  return res;
}