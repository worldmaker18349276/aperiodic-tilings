
export type Rational = {readonly numerator:bigint, readonly denominator:bigint};

function gcd(a: bigint, b: bigint): bigint {
  while (a !== 0n) [a, b] = [b % a, a];
  return b;
}

function abs(a: bigint): bigint {
  return a < 0 ? -a : a;
}

function sign(a: bigint): bigint {
  return a < 0 ? -1n : a > 0 ? 1n : 0n;
}

export function make(n: bigint, d: bigint): Rational {
  if (d === 0n) throw new Error(`invalid rational ${n}/${d}`);
  let c = gcd(abs(n), abs(d));
  return Object.freeze({numerator: n / c * sign(d), denominator: abs(d) / c});
}

export function fromInt(a: number): Rational {
  return Object.freeze({numerator: BigInt(a), denominator: 1n});
}

export function toNumber(value: Rational): number {
  return Number(value.numerator) / Number(value.denominator);
}

export function eq(a: Rational, b: Rational): boolean {
  return a.numerator == b.numerator && a.denominator == b.denominator;
}

export function compare(a: Rational, b: Rational): -1 | 0 | 1 {
  const l = a.numerator * b.denominator;
  const r = a.denominator * b.numerator;
  return l < r ? -1 : l == r ? 0 : 1;
}

export function add(a: Rational, b: Rational): Rational {
  return make(a.numerator * b.denominator + a.denominator * b.numerator, a.denominator * b.denominator);
}

export function mul(a: Rational, b: Rational): Rational {
  return make(a.numerator * b.numerator, a.denominator * b.denominator);
}

export function neg(a: Rational): Rational {
  return Object.freeze({numerator: -a.numerator, denominator: a.denominator});
}

export function inv(a: Rational): Rational {
  if (a.numerator === 0n) throw new Error(`inverse of 0/1`);
  return Object.freeze({numerator: a.denominator * sign(a.numerator), denominator: abs(a.numerator)});
}

export const zero = fromInt(0);

export const one = fromInt(1);

export function toString(r: Rational): string {
  return `${r.numerator}/${r.denominator}`;
}

function parseFloatAsRational(input: string): Rational {
  const m = /^([0-9]+)(?:\.([0-9]+))?$/.exec(input)!;
  return make(BigInt(m[0] + (m[1] ?? "")), 10n ** BigInt(m[1]?.length ?? 0));
}

export function parseRationalExpr(input: string): Rational {
  const tokens: string[] = [];
  const re = /\s*([0-9]+(?:\.[0-9]+)?|[()+\-*/])\s*/g;
  let m;
  while (m = re.exec(input)) {
    tokens.push(m[1]!);
  }
  tokens.push("");

  let i = 0;
  const peek = () => tokens[i]!;
  const next = () => tokens[i++]!;

  function parsePrimary(): Rational {
    let tok = peek();
    if (tok === "(") {
      next();
      const expr = parseAddSub();
      if (peek() !== ")") throw new Error("Expected ')'");
      next();
      return expr;
    }
    let is_neg = false;
    if (tok === "+" || tok === "-") {
      is_neg = tok === "-";
      tok = next();
    }
    if (/^[0-9]+/.test(tok)) {
      next();
      let value = parseFloatAsRational(tok);
      value = is_neg ? neg(value) : value;
      return value;
    }
    throw new Error("Unexpected token: " + tok);
  }

  function parseMulDiv(): Rational {
    let lhs = parsePrimary();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const rhs = parsePrimary();
      if (op === "*") {
        lhs = mul(lhs, rhs);
      } else if (op === "/") {
        lhs = mul(lhs, inv(rhs));
      }
    }
    return lhs;
  }

  function parseAddSub(): Rational {
    let lhs = parseMulDiv();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const rhs = parseMulDiv();
      if (op === "+") {
        lhs = add(lhs, rhs);
      } else if (op === "-") {
        lhs = add(lhs, neg(rhs));
      }
    }
    return lhs;
  }

  const ast = parseAddSub();
  if (peek() !== "") throw new Error("Unexpected extra tokens");
  return ast;
}
