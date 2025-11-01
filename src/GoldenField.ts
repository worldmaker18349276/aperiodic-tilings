/// golden field (that is, Q(sqrt(5))).
/// note that the order of gold field can be easily determined,
/// which is very useful for BBox.

export type GoldenField = Readonly<{_a: bigint, _b: bigint}>;

export type GoldenFieldRational = Readonly<{numerator: GoldenField, denominator: bigint}>;

export function make(_a: bigint, _b: bigint): GoldenField {
  return Object.freeze({_a, _b});
}

export function makeRational(numerator: GoldenField, denominator: bigint): GoldenFieldRational {
  return Object.freeze({numerator, denominator});
}

export const zero = make(0n, 0n);
export const one = make(1n, 0n);
export const sqrt5 = make(0n, 1n);

export function eq(lhs: GoldenField, rhs: GoldenField): boolean {
  return lhs._a === rhs._a && lhs._b === rhs._b;
}

export function compare(lhs: GoldenField, rhs: GoldenField): -1 | 0 | 1 {
  const a_sgn = lhs._a === rhs._a ? 0 : lhs._a > rhs._a ? +1 : -1;
  const b_sgn = lhs._b === rhs._b ? 0 : lhs._b > rhs._b ? +1 : -1;
  if (a_sgn === 0) return b_sgn;
  if (b_sgn === 0) return a_sgn;
  if (a_sgn === b_sgn) return a_sgn;

  const a = lhs._a - rhs._a;
  const b = lhs._b - rhs._b;

  // => a + b sqrt(5)
  const a2 = a ** 2n;
  const _5_b2 = 5n * b ** 2n;
  if (a2 > _5_b2) {
    return a > 0n ? +1 : -1;
  } else {
    return b > 0n ? +1 : -1;
  }
}

export function compareRational(lhs: GoldenFieldRational, rhs: GoldenFieldRational): -1 | 0 | 1 {
  return compare(mulCoeff(lhs.numerator, rhs.denominator), mulCoeff(rhs.numerator, lhs.denominator));
}

export function add(lhs: GoldenField, rhs: GoldenField): GoldenField {
  return make(
    lhs._a + rhs._a,
    lhs._b + rhs._b,
  );
}

export function neg(val: GoldenField): GoldenField {
  return make(
    -val._a,
    -val._b,
  );
}

export function mul(lhs: GoldenField, rhs: GoldenField): GoldenField {
  return make(
    lhs._a * rhs._a + lhs._b * rhs._b * 5n,
    lhs._a * rhs._b + lhs._b * rhs._a,
  );
}

export function mulCoeff(lhs: GoldenField, rhs: bigint): GoldenField {
  return make(
    lhs._a * rhs,
    lhs._b * rhs,
  );
}

export function inv(value: GoldenFieldRational): GoldenFieldRational {
  if (eq(value.numerator, zero)) throw new Error(`inverse of 0/1`);
  const norm_sq = value.numerator._a ** 2n - 5n * value.numerator._b ** 2n;
  const sgn = norm_sq > 0n ? 1n : -1n;
  const numerator = make(
    value.numerator._a * value.denominator * sgn,
    -value.numerator._b * value.denominator * sgn
  );
  const denominator = norm_sq * sgn;
  return makeRational(numerator, denominator);
}

export function toString(value: GoldenField): string {
  return `${value._a} + ${value._b} sqrt(5)`;
}
