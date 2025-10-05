
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

export function makeRational(n: bigint, d: bigint): Rational {
  if (d === 0n) throw new Error(`invalid rational ${n}/${d}`);
  let c = gcd(abs(n), abs(d));
  return Object.freeze({numerator: n / c * sign(d), denominator: abs(d) / c});
}

export function fromInt(a: number): Rational {
  return Object.freeze({numerator: BigInt(a), denominator: 1n});
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
  return makeRational(a.numerator * b.denominator + a.denominator * b.numerator, a.denominator * b.denominator);
}

export function mul(a: Rational, b: Rational): Rational {
  return makeRational(a.numerator * b.numerator, a.denominator * b.denominator);
}

export function neg(a: Rational): Rational {
  return Object.freeze({numerator: -a.numerator, denominator: a.denominator});
}

export function inv(a: Rational): Rational {
  if (a.numerator === 0n) throw new Error(`inverse of 0/1`);
  return Object.freeze({numerator: a.denominator * sign(a.numerator), denominator: abs(a.numerator)});
}

export const rational_field = {add, mul, neg, inv};
