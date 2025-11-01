/// cyclotomic field of root 5.
/// its real part is gold field.
/// note that its multiplication and reciprocal are complicated to compute.

import * as GF from "./GoldenField.js";

export type CyclotomicField5 = Readonly<{
  _0: bigint,
  _1: bigint,
  _2: bigint,
  _3: bigint,
}>;

export type CyclotomicField5Rational = Readonly<{numerator: CyclotomicField5, denominator: bigint}>;

export function make(_0: bigint, _1: bigint, _2: bigint, _3: bigint): CyclotomicField5 {
  return Object.freeze({_0, _1, _2, _3});
}

export function make_(_0: bigint, _1: bigint, _2: bigint, _3: bigint, _4: bigint): CyclotomicField5 {
  return make(_0 - _4, _1 - _4, _2 - _4, _3 - _4);
}

export function makeRational(numerator: CyclotomicField5, denominator: bigint): CyclotomicField5Rational {
  return Object.freeze({numerator, denominator});
}

export const zero = make(0n, 0n, 0n, 0n);
export const one = make(1n, 0n, 0n, 0n);
export const zeta = make(0n, 1n, 0n, 0n);
export const zeta2 = make(0n, 0n, 1n, 0n);
export const zeta3 = make(0n, 0n, 0n, 1n);
export const zeta4 = make_(0n, 0n, 0n, 0n, 1n);

// -2 Im(zeta) i = -i sqrt(phi sqrt(5)) = -sqrt((5 + sqrt(5))/2) i = -1.9020 i
export const neg_2_zeta_imag = make_(0n, -1n, 0n, 0n, 1n);


export function eq(lhs: CyclotomicField5, rhs: CyclotomicField5): boolean {
  return lhs._0 === rhs._0
    && lhs._1 === rhs._1
    && lhs._2 === rhs._2
    && lhs._3 === rhs._3;
}

export function add(lhs: CyclotomicField5, rhs: CyclotomicField5): CyclotomicField5 {
  return make(
    lhs._0 + rhs._0,
    lhs._1 + rhs._1,
    lhs._2 + rhs._2,
    lhs._3 + rhs._3,
  );
}

export function neg(val: CyclotomicField5): CyclotomicField5 {
  return make(
    -val._0,
    -val._1,
    -val._2,
    -val._3,
  );
}

export function mul(lhs: CyclotomicField5, rhs: CyclotomicField5): CyclotomicField5 {
  return make_(
    lhs._0 * rhs._0                   + lhs._2 * rhs._3 + lhs._3 * rhs._2,
    lhs._0 * rhs._1 + lhs._1 * rhs._0                   + lhs._3 * rhs._3,
    lhs._0 * rhs._2 + lhs._1 * rhs._1 + lhs._2 * rhs._0,
    lhs._0 * rhs._3 + lhs._1 * rhs._2 + lhs._2 * rhs._1 + lhs._3 * rhs._0,
                      lhs._1 * rhs._3 + lhs._2 * rhs._2 + lhs._3 * rhs._1,
  );
}

export function mulCoeff(lhs: CyclotomicField5, rhs: bigint): CyclotomicField5 {
  return make(
    lhs._0 * rhs,
    lhs._1 * rhs,
    lhs._2 * rhs,
    lhs._3 * rhs,
  );
}

export function inv(value: CyclotomicField5Rational): CyclotomicField5Rational {
  if (eq(value.numerator, zero)) throw new Error(`inverse of 0/1`);
  const c0 = value.numerator;
  const c1 = make_(c0._0, c0._3, c0._1,    0n, c0._2);
  const c2 = make_(c0._0, c0._2,    0n, c0._1, c0._3);
  const c3 = make_(c0._0,    0n, c0._3, c0._2, c0._1);
  const conj_value = mul(mul(c1, c2), c3);

  const norm = mul(c0, conj_value)._0;
  const denominator = norm > 0n ? norm : -norm;
  const numerator = mulCoeff(conj_value, norm > 0n ? value.denominator : -value.denominator);
  return makeRational(numerator, denominator);
}

export function conj(value: CyclotomicField5): CyclotomicField5 {
  return make_(
    value._0,
    0n,
    value._3,
    value._2,
    value._1,
  );
}

export function toString(value: CyclotomicField5): string {
  return `${value._0} + ${value._1} zeta + ${value._2} zeta^2 + ${value._3} zeta^3`;
}

// 4 Re(zeta) = 2 phi^-1 = sqrt(5) - 1
const zeta_real_4: GF.GoldenField = GF.make(-1n, 1n);

// 4 Re(zeta^2) = -2 phi = -sqrt(5) - 1
const zeta2_real_4: GF.GoldenField = GF.make(-1n, -1n);

export function real(value: CyclotomicField5): GF.GoldenFieldRational {
  let _a = value._0 * 4n;
  let _b = 0n;
  _a += value._1 * zeta_real_4._a;
  _b += value._1 * zeta_real_4._b;
  _a += value._2 * zeta2_real_4._a;
  _b += value._2 * zeta2_real_4._b;
  _a += value._3 * zeta2_real_4._a;
  _b += value._3 * zeta2_real_4._b;
  return GF.makeRational(GF.make(_a, _b), 4n);
}

// return 2 Re[z], 2 Im[z]
export function real_imag_2(z: CyclotomicField5): [CyclotomicField5, CyclotomicField5] {
  const z_ = conj(z);
  return [
    add(z, z_),
    add(z, neg(z_)),
  ];
}
