import * as Rational from "./Rational";

export type GoldenField = {
  readonly _a: Rational.Rational,
  readonly _b: Rational.Rational,
};

export function make(
  _a: Rational.Rational,
  _b: Rational.Rational,
): GoldenField {
  return Object.freeze({_a, _b});
}

export const zero = make(Rational.zero, Rational.zero);

export const one = make(Rational.one, Rational.zero);

export const sqrt5 = make(Rational.zero, Rational.one);

export const phi = make(Rational.make(1n, 2n), Rational.make(1n, 2n));

export function eq(lhs: GoldenField, rhs: GoldenField): boolean {
  return Rational.eq(lhs._a, rhs._a)
    && Rational.eq(lhs._b, rhs._b);
}

export function compare(lhs: GoldenField, rhs: GoldenField): -1 | 0 | 1 {
  return sign(add(lhs, neg(rhs)));
}

export function sign(value: GoldenField): -1 | 0 | 1 {
  if (value._a.numerator === 0n && value._b.numerator === 0n) return 0;
  if (value._a.numerator === 0n) return value._b.numerator > 0n ? +1 : -1;
  if (value._b.numerator === 0n) return value._a.numerator > 0n ? +1 : -1;
  if ((value._a.numerator > 0n) === (value._b.numerator > 0n)) return value._a.numerator > 0n ? +1 : -1;
  // => a + b sqrt(5)
  const a = value._a.numerator * value._b.denominator;
  const b = value._b.numerator * value._a.denominator;
  const a2 = a * a;
  const b2_5 = b * b * 5n;
  return (a2 > b2_5) === (a > 0n) ? +1 : -1;
}

export function add(lhs: GoldenField, rhs: GoldenField): GoldenField {
  return make(
    Rational.add(lhs._a, rhs._a),
    Rational.add(lhs._b, rhs._b),
  );
}

export function neg(val: GoldenField): GoldenField {
  return make(
    Rational.neg(val._a),
    Rational.neg(val._b),
  );
}

export function mul(lhs: GoldenField, rhs: GoldenField): GoldenField {
  return make(
    Rational.add(
      Rational.mul(lhs._a, rhs._a),
      Rational.mul(Rational.mul(lhs._b, rhs._b), Rational.make(5n, 1n)),
    ),
    Rational.add(
      Rational.mul(lhs._a, rhs._b),
      Rational.mul(lhs._b, rhs._a),
    ),
  );
}

export function mul_coeff(lhs: GoldenField, rhs: Rational.Rational): GoldenField {
  return make(
    Rational.mul(lhs._a, rhs),
    Rational.mul(lhs._b, rhs),
  );
}

export function inv(value: GoldenField): GoldenField {
  const n = Rational.inv(Rational.add(
    Rational.mul(value._a, value._a),
    Rational.mul(Rational.mul(value._b, value._b), Rational.make(-5n, 1n))
  ));
  return make(
    Rational.mul(value._a, n),
    Rational.mul(Rational.neg(value._b), n),
  );
}

export function toNumber(value: GoldenField): number {
  return Rational.toNumber(value._a) + Rational.toNumber(value._b) * Math.sqrt(5);
}

export function toString(value: GoldenField): string {
  return `${value._a} + ${value._b} sqrt(5)`;
}
