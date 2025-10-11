
export type Complex = {readonly real: number, readonly imag: number};

export function make(real: number, imag: number): Complex {
  return Object.freeze({real, imag});
}

export const zero = make(0.0, 0.0);
export const one = make(1.0, 0.0);
export const i = make(0.0, 1.0);

export function add(lhs: Complex, rhs: Complex): Complex {
  return make(lhs.real + rhs.real, lhs.imag + rhs.imag);
}

export function mul(lhs: Complex, rhs: Complex): Complex {
  return make(lhs.real * rhs.real - lhs.imag * rhs.imag, lhs.real * rhs.imag + lhs.imag * rhs.real);
}

export function mul_coeff(lhs: Complex, rhs: number): Complex {
  return make(lhs.real * rhs, lhs.imag * rhs);
}

export function neg(value: Complex): Complex {
  return make(-value.real, -value.imag);
}

export function inv(value: Complex): Complex {
  const norm = Math.sqrt(normSq(value));
  return make(value.real/norm, -value.imag/norm);
}

export function normSq(value: Complex): number {
  return value.real * value.real + value.imag * value.imag;
}

export function conj(value: Complex): Complex {
  return make(value.real, -value.imag);
}

export function toString(value: Complex): string {
  return `${value.real} + ${value.imag} i`;
}
