/// approximate conversion between floating point/rational numbers and the extension fields.
/// it is done by approximating some algebraic operations on rational numbers in any precision,
/// such as sqrt(_), _ * sqrt(5), _ / Im(zeta)^2.

import * as Rational from "./Rational.js";
import * as BBox from "./BBox.js";
import * as CF5 from "./CyclotomicField5.js";
import * as GF from "./GoldenField.js";

function solve(f: (x: bigint) => bigint, x0: bigint, x1: bigint, floor: boolean): bigint {
  let y0 = f(x0);
  if (y0 === 0n) return x0;
  let y1 = f(x1);
  if (y1 === 0n) return x1;

  for (let count = 0;; count++) {
    // if (count % 10000 == 0) console.log(`solver ${count}`);
    const s0 = y0 > 0n;
    const s1 = y1 > 0n;
    if (s0 !== s1 && (x0 - x1 === 1n || x1 - x0 === 1n)) {
      return floor === (x0 < x1) ? x0 : x1;
    }

    let x2 = (x1 * y0 - x0 * y1) / (y0 - y1);
    if (x0 === x2) {
      x2 = (s0 !== s1) === (x0 < x1) ? x0 + 1n : x0 - 1n;
    } else if (x1 === x2) {
      x2 = (s0 !== s1) === (x1 < x0) ? x1 + 1n : x1 - 1n;
    }
    const y2 = f(x2);
    if (y2 === 0n) return x2;
    const s2 = y2 > 0n;

    if (s0 !== s1) {
      if (s0 === s2) {
        x0 = x2;
        y0 = y2;
      } else {
        x1 = x2;
        y1 = y2;
      }
    } else {
      if ((x2 < x0) === (x0 < x1)) {
        x1 = x2;
        y1 = y2;
      } else {
        x0 = x2;
        y0 = y2;
      }
    }
  }  
}

// approximate sqrt(value)
function sqrt(value: bigint, floor: boolean): bigint | undefined {
  if (value < 0n) return undefined;

  // x^2 - r = 0
  // solve f(x) = x^2 - r = 0

  const x0 = BigInt(Math.ceil(Math.sqrt(Number(value))));
  return solve(x => x ** 2n - value, x0, x0 + 1n, floor);
}

// sqrt(5) ceiling approximation
const sqrt5_approx = Rational.make(
  BigInt(Math.ceil(Math.sqrt(5)) * 1e+9),
  BigInt(1e+9),
);

// approximate value * sqrt(5)
function mul_sqrt5(value: bigint, floor: boolean): bigint {
  if (value < 0n) {
    return -mul_sqrt5(-value, !floor);
  }

  // sqrt(5) r - x = 0
  // 5 r^2 - x^2 = 0
  // solve f(x) = x^2 - 5 r^2 = 0

  const x0 = value * sqrt5_approx.numerator / sqrt5_approx.denominator;
  const _5r2 = 5n * value ** 2n;
  return solve(x => x ** 2n - _5r2, x0, x0 + 1n, floor);
}

// 4 Im(zeta)^2 ceiling approximation
const _4_zeta_imag_sq_approx = Rational.make(
  BigInt(Math.ceil((5 + Math.sqrt(5))/2 * 1e+9)),
  BigInt(1e+9),
);

// approximate value / 4 Im(zeta)^2
function div_4_zeta_imag_sq(value: bigint, floor: boolean): bigint {
  if (value < 0n) {
    return -div_4_zeta_imag_sq(-value, !floor);
  }
  // 4 Im(zeta)^2 x - r = 0
  // 5/2 x +- sqrt(5)/2 x - r = 0
  // (5 x - 2 r)^2 - 5 x^2 = 0
  // solve f(x) = (5 x - 2 r)^2 - 5 x^2 = 0
  
  const x0 = value * _4_zeta_imag_sq_approx.denominator / _4_zeta_imag_sq_approx.numerator;
  const _2r = 2n * value;
  return solve(x => (5n * x - _2r) ** 2n - 5n * x ** 2n, x0, x0 + 1n, floor);
}

// approximate value / 2 Im(zeta)
function div_2_zeta_imag(value: bigint, floor: boolean): bigint {
  const value_sq = value ** 2n;
  const sgn = value >= 0n ? 1n : -1n;
  if (sgn === -1n) floor = !floor;
  return sgn * sqrt(div_4_zeta_imag_sq(value_sq, floor), floor)!;
}


// approximate a bounding box by given boundary in rational numbers.
export function approxBBox(left: bigint, bottom: bigint, right: bigint, top: bigint, unit: Rational.Rational): BBox.BBoxRational {
  const left_ = left * unit.numerator;
  const right_ = right * unit.numerator;
  const bottom_ = div_2_zeta_imag(bottom, true) * unit.numerator;
  const top_ = div_2_zeta_imag(top, false) * unit.numerator;
  return BBox.make(
    CF5.make_(left_, bottom_, 0n, 0n, -bottom_),
    CF5.make_(right_, top_, 0n, 0n, -top_),
    unit.denominator,
  );
}

function approxGoldenFieldRational(value: GF.GoldenFieldRational, floor: boolean): Rational.Rational {
  return Rational.make(value.numerator._a + mul_sqrt5(value.numerator._b, floor), value.denominator);
}

export type Complex = Readonly<{re: number, im: number}>;

// approximate CF5 as floating numbers in the coordinate of given frame box (1 represents top/right edge).
export function approxCyclotomicField5(value: CF5.CyclotomicField5, frame: BBox.BBoxRational): Complex {
  const offset = CF5.neg(frame.numerator.bl);
  const extent = CF5.add(frame.numerator.tr, offset);
  const value_num = CF5.add(CF5.mulCoeff(value, frame.denominator), offset);

  const value_num_x = CF5.real(value_num);
  const width_inv = GF.inv(CF5.real(extent));
  const value_x = {
    numerator: GF.mul(value_num_x.numerator, width_inv.numerator),
    denominator: value_num_x.denominator * width_inv.denominator,
  };
  const re = Rational.approxToNumber(approxGoldenFieldRational(value_x, true));

  const value_num_y = CF5.real(CF5.mul(value_num, CF5.neg_2_zeta_imag));
  const height_inv = GF.inv(CF5.real(CF5.mul(extent, CF5.neg_2_zeta_imag)));
  const value_y = {
    numerator: GF.mul(value_num_y.numerator, height_inv.numerator),
    denominator: value_num_y.denominator * height_inv.denominator,
  };
  const im = Rational.approxToNumber(approxGoldenFieldRational(value_y, true));

  return Object.freeze({re, im});
}
