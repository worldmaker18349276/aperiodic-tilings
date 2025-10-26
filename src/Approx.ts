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
function sqrt(value: Rational.Rational, floor: boolean, denominator: bigint): Rational.Rational | undefined {
  if (value.numerator < 0n) return;

  // x^2 - r = 0
  // let n/d = x, a/b = r
  // solve f(n) = b n^2 - a d^2

  const sqrt_num = Rational.approxToNumber(value);

  let n = BigInt(Math.floor(sqrt_num * Number(denominator)));
  let d = denominator;
  
  const a = value.numerator;
  const b = value.denominator;
  const _ad2 = a * d ** 2n;
  n = solve(n => b * n ** 2n - _ad2, n, n + 1n, floor);
  
  return Rational.make(n, d);
}

// sqrt(5) ceiling approximation
const sqrt5_approx = Rational.make(
  BigInt(Math.ceil(Math.sqrt(5)) * 1e+9),
  BigInt(1e+9),
);

// approximate value * sqrt(5)
function mul_sqrt5(value: Rational.Rational, floor: boolean, denominator: bigint): Rational.Rational {
  if (value.numerator < 0n) {
    return Rational.neg(mul_sqrt5(Rational.neg(value), !floor, denominator));
  }

  // sqrt(5) r - x = 0
  // 5 r^2 - x^2 = 0
  // let n/d = x, a/b = r^2
  // solve f(n) = b n^2 - 5 a d^2

  let n = value.numerator * sqrt5_approx.numerator;
  let d = value.denominator * sqrt5_approx.denominator;
  while (d < denominator) {
    n *= 2n;
    d *= 2n;
  }
  
  const a = value.numerator * value.numerator;
  const b = value.denominator * value.denominator;
  const _5ad2 = 5n * a * d ** 2n;
  n = solve(n => b * n ** 2n - _5ad2, n, n - 1n, floor);
  
  return Rational.make(n, d);
}

// Im(zeta)^2 ceiling approximation
const zeta_imag_sq_approx = Rational.make(
  BigInt(Math.ceil((5 + Math.sqrt(5))/8 * 1e+9)),
  BigInt(1e+9),
);

// approximate value / Im(zeta)^2
function div_zeta_imag_sq(value: Rational.Rational, floor: boolean, denominator: bigint): Rational.Rational {
  if (value.numerator < 0n) {
    return Rational.neg(div_zeta_imag_sq(Rational.neg(value), !floor, denominator));
  }
  // Im(zeta)^2 x - r = 0
  // 5/8 x +- sqrt(5)/8 x - r = 0
  // (5 x - 8 r)^2 - 5 x^2 = 0
  // let n/d = x, a/b = r
  // solve f(n) = (5 b n - 8 a d)^2 - 5 b^2 n^2 = 0
  
  let n = value.numerator * zeta_imag_sq_approx.denominator;
  let d = value.denominator * zeta_imag_sq_approx.numerator;
  while (d < denominator) {
    n *= 2n;
    d *= 2n;
  }

  const a = value.numerator;
  const b = value.denominator;
  const _8ad = 8n * a * d;
  const f = (n: bigint) => {
    let _5bn = 5n * b * n;
    return (_5bn - _8ad) ** 2n - _5bn ** 2n / 5n;
  };
  n = solve(f, n, n - 1n, floor);
  
  return Rational.make(n, d);
}

// approximate value / Im(zeta)
function div_zeta_imag(value: Rational.Rational, floor: boolean, denominator: bigint): Rational.Rational {
  const value_sq = Rational.mul(value, value);
  const sgn = (value.numerator >= 0) === (value.denominator >= 0) ? 1n : -1n;
  if (sgn === -1n) floor = !floor;
  //                                                 vvvvvvvvvvvvvvvvv--- no, this is wrong...
  const res = sqrt(div_zeta_imag_sq(value_sq, floor, denominator ** 2n), floor, denominator)!;
  return sgn === -1n ? Rational.neg(res) : res;
}


// approximate a bounding box by given boundary in rational numbers.
export function approxBBox(
  left: Rational.Rational,
  bottom: Rational.Rational,
  right: Rational.Rational,
  top: Rational.Rational,
  denominator: bigint = BigInt(1e9),
): BBox.BBox {
  const b = div_zeta_imag(bottom, true, denominator);
  const t = div_zeta_imag(top, false, denominator);
  return BBox.make(
    CF5.make_(
      left,
      Rational.mul(b, Rational.make(1n, 2n)),
      Rational.zero,
      Rational.zero,
      Rational.mul(b, Rational.make(-1n, 2n)),
    ),
    CF5.make_(
      right,
      Rational.mul(t, Rational.make(1n, 2n)),
      Rational.zero,
      Rational.zero,
      Rational.mul(t, Rational.make(-1n, 2n)),
    ),
  );
}

function approxGoldenField(value: GF.GoldenField, floor: boolean, denominator: bigint): Rational.Rational {
  return Rational.add(value._a, mul_sqrt5(value._b, floor, denominator));
}

export type Complex = {readonly re: number, readonly im: number};

// approximate CF5 as floating numbers in the coordinate of given frame box (1 represents top/right edge).
export function approxCyclotomicField5(value: CF5.CyclotomicField5, frame: BBox.BBox, denominator: bigint): Complex {
  const offset = CF5.neg(frame.bl);
  const extent = CF5.add(frame.tr, offset);
  const value_ = CF5.add(value, offset);

  const width = CF5.real(extent);
  const value_x = CF5.real(value_);
  const re_ = approxGoldenField(GF.mul(value_x, GF.inv(width)), true, denominator);
  const re = Rational.approxToNumber(re_);

  const height = CF5.real(CF5.mul(extent, CF5.neg_zeta_imag));
  const value_y = CF5.real(CF5.mul(value_, CF5.neg_zeta_imag));
  const im_ = approxGoldenField(GF.mul(value_y, GF.inv(height)), true, denominator);
  const im = Rational.approxToNumber(im_);

  return Object.freeze({re, im});
}
