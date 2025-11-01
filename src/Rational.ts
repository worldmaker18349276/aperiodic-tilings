/// rational number composed of two bigint

export type Rational = {readonly numerator:bigint, readonly denominator:bigint};

// // Stein's Algorithm, where a >= 0n && b >= 0n
// export function gcd(a: bigint, b: bigint) {
//   if (a === 0n) return b;
//   if (b === 0n) return a;

//   // Finding K, where K is the greatest power of 2 that divides both a and b.
//   let k: bigint;
//   for (k = 0n; ((a | b) & 1n) === 0n; k++) {
//     a >>= 1n;
//     b >>= 1n;
//   }

//   // Dividing a by 2 until a becomes odd
//   while ((a & 1n) === 0n) a >>= 1n;

//   // From here on, 'a' is always odd.
//   do {
//     // If b is even, remove all factor of 2 in b
//     while ((b & 1n) === 0n) b >>= 1n;

//     // Now a and b are both odd. Swap if necessary so a <= b, then set b = b - a (which is even).
//     if (a > b) [a, b] = [b, a];

//     b = b - a;
//   } while (b !== 0n);

//   // restore common factors of 2
//   return a << k;
// }

export function gcd(a: bigint, b: bigint): bigint {
  while (a !== 0n) [a, b] = [b % a, a];
  return b;
}

function abs(a: bigint): bigint {
  return a < 0n ? -a : a;
}

function sign(a: bigint): bigint {
  return a < 0n ? -1n : a > 0n ? 1n : 0n;
}

export function make(n: bigint, d: bigint): Rational {
  if (d === 0n) throw new Error(`invalid rational ${n}/${d}`);
  let c = gcd(abs(n), abs(d));
  return Object.freeze({numerator: n / c * sign(d), denominator: abs(d) / c});
}

export function fromInt(value: number): Rational {
  return Object.freeze({numerator: BigInt(value), denominator: 1n});
}

export function fromNumber(value: number): Rational {
  let d = value;
  let n = 1n;
  while (!Number.isInteger(d)) {
    d = d * 2;
    n = n * 2n;
  }
  return make(BigInt(d), n);
}

export function approxToNumber(value: Rational): number {
  return Number(value.numerator / value.denominator)
    + Number(value.numerator % value.denominator) / Number(value.denominator);
}

export function roundTo(value: Rational, denominator: bigint, floor: boolean): Rational {
  const n = abs(value.numerator) * denominator;
  const s = sign(value.numerator);
  if (s === -1n) floor = !floor;
  const numerator = s * (n / value.denominator + (!floor && n % value.denominator !== 0n ? 1n : 0n));
  return make(numerator, denominator);
}

export function eq(lhs: Rational, rhs: Rational): boolean {
  return lhs.numerator === rhs.numerator && lhs.denominator === rhs.denominator;
}

export function compare(lhs: Rational, rhs: Rational): -1 | 0 | 1 {
  if (eq(lhs, rhs)) return 0;
  const lhs_i = integer(lhs);
  const rhs_i = integer(rhs);
  if (lhs_i < rhs_i) return -1;
  if (lhs_i > rhs_i) return +1;
  const l = lhs.numerator * rhs.denominator;
  const r = lhs.denominator * rhs.numerator;
  return l < r ? -1 : l == r ? 0 : 1;
}

export function add(lhs: Rational, rhs: Rational): Rational {
  return make(
    lhs.numerator * rhs.denominator + lhs.denominator * rhs.numerator,
    lhs.denominator * rhs.denominator,
  );
}

export function mul(lhs: Rational, rhs: Rational): Rational {
  // return make(
  //   lhs.numerator * rhs.numerator,
  //   lhs.denominator * rhs.denominator,
  // );
  if (lhs.numerator === 0n) return zero;
  if (rhs.numerator === 0n) return zero;
  const lfactor = gcd(abs(lhs.numerator), rhs.denominator);
  const rfactor = gcd(abs(rhs.numerator), lhs.denominator);
  return Object.freeze({
    numerator: (lhs.numerator / lfactor) * (rhs.numerator / rfactor),
    denominator: (lhs.denominator / rfactor) * (rhs.denominator / lfactor),
  });
}

export function neg(value: Rational): Rational {
  return Object.freeze({numerator: -value.numerator, denominator: value.denominator});
}

export function inv(value: Rational): Rational {
  if (value.numerator === 0n) throw new Error(`inverse of 0/1`);
  return Object.freeze({numerator: value.denominator * sign(value.numerator), denominator: abs(value.numerator)});
}

export function integer(value: Rational): bigint {
  return value.numerator / value.denominator;
}

export function fractional(value: Rational): Rational {
  return Object.freeze({numerator: value.numerator % value.denominator, denominator: value.denominator});
}

export const zero = fromInt(0);

export const one = fromInt(1);

export function toString(value: Rational): string {
  return `${value.numerator}/${value.denominator}`;
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
