/// cyclotomic field of root 5.
/// its real part is gold field.
/// note that its reciprocal is complicated to compute.

import * as Rational from "./Rational.js";
import * as Complex from "./Complex.js";
import * as GoldenField from "./GoldenField.js";
import * as Approx from "./Approx.js";

export type CyclotomicField5 = {
  readonly _0: Rational.Rational,
  readonly _1: Rational.Rational,
  readonly _2: Rational.Rational,
  readonly _3: Rational.Rational,
};

export function make(
  _0: Rational.Rational,
  _1: Rational.Rational,
  _2: Rational.Rational,
  _3: Rational.Rational,
): CyclotomicField5 {
  return Object.freeze({_0, _1, _2, _3});
}

function make_(
  _0: Rational.Rational,
  _1: Rational.Rational,
  _2: Rational.Rational,
  _3: Rational.Rational,
  _4: Rational.Rational,
): CyclotomicField5 {
  const neg_4 = Rational.neg(_4);
  return make(
    Rational.add(_0, neg_4),
    Rational.add(_1, neg_4),
    Rational.add(_2, neg_4),
    Rational.add(_3, neg_4),
  );
}

export const zero = make(Rational.zero, Rational.zero, Rational.zero, Rational.zero);

export const one = make(Rational.one, Rational.zero, Rational.zero, Rational.zero);

export const zeta = make(Rational.zero, Rational.one, Rational.zero, Rational.zero);

export function eq(lhs: CyclotomicField5, rhs: CyclotomicField5): boolean {
  return Rational.eq(lhs._0, rhs._0)
    && Rational.eq(lhs._1, rhs._1)
    && Rational.eq(lhs._2, rhs._2)
    && Rational.eq(lhs._3, rhs._3);
}

export function add(lhs: CyclotomicField5, rhs: CyclotomicField5): CyclotomicField5 {
  return make(
    Rational.add(lhs._0, rhs._0),
    Rational.add(lhs._1, rhs._1),
    Rational.add(lhs._2, rhs._2),
    Rational.add(lhs._3, rhs._3),
  );
}

export function neg(val: CyclotomicField5): CyclotomicField5 {
  return make(
    Rational.neg(val._0),
    Rational.neg(val._1),
    Rational.neg(val._2),
    Rational.neg(val._3),
  );
}

function sumRational(...values: Rational.Rational[]): Rational.Rational {
  let sum = Rational.zero;
  for (const value of values) sum = Rational.add(sum, value);
  return sum;
}

export function mul(lhs: CyclotomicField5, rhs: CyclotomicField5): CyclotomicField5 {
  return make_(
    sumRational(
      Rational.mul(lhs._0, rhs._0),
      Rational.mul(lhs._2, rhs._3),
      Rational.mul(lhs._3, rhs._2),
    ),
    sumRational(
      Rational.mul(lhs._0, rhs._1),
      Rational.mul(lhs._1, rhs._0),
      Rational.mul(lhs._3, rhs._3),
    ),
    sumRational(
      Rational.mul(lhs._0, rhs._2),
      Rational.mul(lhs._1, rhs._1),
      Rational.mul(lhs._2, rhs._0),
    ),
    sumRational(
      Rational.mul(lhs._0, rhs._3),
      Rational.mul(lhs._1, rhs._2),
      Rational.mul(lhs._2, rhs._1),
      Rational.mul(lhs._3, rhs._0),
    ),
    sumRational(
      Rational.mul(lhs._1, rhs._3),
      Rational.mul(lhs._2, rhs._2),
      Rational.mul(lhs._3, rhs._1)
    ),
  );
}

export function mulCoeff(lhs: CyclotomicField5, rhs: Rational.Rational): CyclotomicField5 {
  return make(
    Rational.mul(lhs._0, rhs),
    Rational.mul(lhs._1, rhs),
    Rational.mul(lhs._2, rhs),
    Rational.mul(lhs._3, rhs),
  );
}

export function inv(value: CyclotomicField5): CyclotomicField5 {
  const c1 = make_(
    value._0,
    value._3,
    value._1,
    Rational.zero,
    value._2,
  );
  const c2 = make_(
    value._0,
    value._2,
    Rational.zero,
    value._1,
    value._3,
  );
  const c3 = make_(
    value._0,
    Rational.zero,
    value._3,
    value._2,
    value._1,
  );
  const conj_value = mul(mul(c1, c2), c3);

  const norm = mul(value, conj_value);
  return mulCoeff(conj_value, Rational.inv(norm._0));
}

export function conj(value: CyclotomicField5): CyclotomicField5 {
  return make_(
    value._0,
    Rational.zero,
    value._3,
    value._2,
    value._1,
  );
}

export function toString(value: CyclotomicField5): string {
  return `${value._0} + ${value._1} zeta + ${value._2} zeta^2 + ${value._3} zeta^3`;
}

// Re(zeta) = 1/2 phi^-1 = (sqrt(5) - 1) / 4
const zeta_real: GoldenField.GoldenField = Object.freeze({
  _a: Rational.make(-1n, 4n),
  _b: Rational.make(1n, 4n),
});

// Re(zeta^2) = -1/2 phi = (-sqrt(5) - 1) / 4
const zeta2_real: GoldenField.GoldenField = Object.freeze({
  _a: Rational.make(-1n, 4n),
  _b: Rational.make(-1n, 4n),
});

export function real(value: CyclotomicField5): GoldenField.GoldenField {
  let _a = value._0;
  let _b = Rational.zero;
  _a = Rational.add(_a, Rational.mul(value._1, zeta_real._a));
  _b = Rational.add(_b, Rational.mul(value._1, zeta_real._b));
  _a = Rational.add(_a, Rational.mul(value._2, zeta2_real._a));
  _b = Rational.add(_b, Rational.mul(value._2, zeta2_real._b));
  _a = Rational.add(_a, Rational.mul(value._3, zeta2_real._a));
  _b = Rational.add(_b, Rational.mul(value._3, zeta2_real._b));
  return Object.freeze({_a, _b});
}

// -Im(zeta) i = -i/2 sqrt(phi sqrt(5)) = -sqrt((5 + sqrt(5))/8) i = -0.9510 i
const neg_zeta_imag: CyclotomicField5 = Object.freeze({
  _0: Rational.make(-1n, 2n),
  _1: Rational.make(-1n, 1n),
  _2: Rational.make(-1n, 2n),
  _3: Rational.make(-1n, 2n),
});

export function approxToComplex(value: CyclotomicField5, floor: [boolean, boolean], eps: bigint = BigInt(1e9)): Complex.Complex {
  const re = GoldenField.approxToRational(real(value), floor[0], eps);
  const value_ = mul(value, neg_zeta_imag);
  const eps_ = eps * 20n / 19n; // = eps / Im(zeta)
  const im_ = GoldenField.approxToRational(real(value_), floor[1], eps_);
  const [n, d] = Approx.mul_zeta_imag([im_.numerator, im_.denominator], floor[1], eps);
  const im = Rational.make(n, d);
  return Complex.make(re, im);
}

