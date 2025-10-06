import * as Rational from "./Rational";
import * as Complex from "./Complex";

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

export const zero = make(Rational.zero, Rational.zero, Rational.zero, Rational.zero);;

export const one = make(Rational.one, Rational.zero, Rational.zero, Rational.zero);;

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

export function mul_coeff(lhs: CyclotomicField5, rhs: Rational.Rational): CyclotomicField5 {
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
  return mul_coeff(conj_value, Rational.inv(norm._0));
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

const zeta_num = Complex.make(
  Math.cos(2.0 * Math.PI / 5.0),
  Math.sin(2.0 * Math.PI / 5.0),
);

function sumComplex(...values: Complex.Complex[]): Complex.Complex {
  let sum = Complex.zero;
  for (const value of values) sum = Complex.add(sum, value);
  return sum;
}

export function toComplex(value: CyclotomicField5): Complex.Complex {
  const a0 = Complex.make(Rational.toNumber(value._0), 0.0);
  const a1 = Complex.make(Rational.toNumber(value._1), 0.0);
  const a2 = Complex.make(Rational.toNumber(value._2), 0.0);
  const a3 = Complex.make(Rational.toNumber(value._3), 0.0);
  const z1 = zeta_num;
  const z2 = Complex.mul(z1, zeta_num);
  const z3 = Complex.mul(z2, zeta_num);
  return sumComplex(
    a0,
    Complex.mul(a1, z1),
    Complex.mul(a2, z2),
    Complex.mul(a3, z3),
  );
}
