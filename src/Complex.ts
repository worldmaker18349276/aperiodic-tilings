/// complex number composed of two rational numbers

import * as Rational from "./Rational.js";

export type Complex = {readonly real: Rational.Rational, readonly imag: Rational.Rational};

export function make(real: Rational.Rational, imag: Rational.Rational): Complex {
  return Object.freeze({real, imag});
}

export const zero = make(Rational.zero, Rational.zero);
export const one = make(Rational.one, Rational.zero);
export const i = make(Rational.zero, Rational.one);

export function add(lhs: Complex, rhs: Complex): Complex {
  return make(Rational.add(lhs.real, rhs.real), Rational.add(lhs.imag, rhs.imag));
}

export function mul(lhs: Complex, rhs: Complex): Complex {
  return make(
    Rational.add(Rational.mul(lhs.real, rhs.real), Rational.neg(Rational.mul(lhs.imag, rhs.imag))),
    Rational.add(Rational.mul(lhs.real, rhs.imag), Rational.mul(lhs.imag, rhs.real)),
  );
}

export function mulCoeff(lhs: Complex, rhs: Rational.Rational): Complex {
  return make(Rational.mul(lhs.real, rhs), Rational.mul(lhs.imag, rhs));
}

export function neg(value: Complex): Complex {
  return make(Rational.neg(value.real), Rational.neg(value.imag));
}

// export function inv(value: Complex): Complex {
//   const scale = 1/Math.sqrt(normSq(value));
//   return make(Rational.mul(value.real, scale), Rational.mul(Rational.neg(value.imag), scale));
// }

export function normSq(value: Complex): Rational.Rational {
  return Rational.add(Rational.mul(value.real, value.real), Rational.mul(value.imag, value.imag));
}

export function conj(value: Complex): Complex {
  return make(value.real, Rational.neg(value.imag));
}

export function toString(value: Complex): string {
  return `${value.real} + ${value.imag} i`;
}
