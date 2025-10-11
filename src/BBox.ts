import * as CF5 from "./CyclotomicField5";
import * as Rational from "./Rational";

export type BBox = {
  readonly bl: Rational.Rational,
  readonly tr: Rational.Rational,
};

export type Triangle = {
  readonly a: CF5.CyclotomicField5,
  readonly b: CF5.CyclotomicField5,
  readonly c: CF5.CyclotomicField5,
};

export enum IntersectionResult {Disjoint, Intersect, Contain}

export function intersect({a, b, c}: Triangle, bbox: BBox): IntersectionResult {
  // const r = CF5.inv(CF5.add(a, CF5.neg(b)));
  // const neg_b = CF5.neg(b);
  // const trans = (z: CF5.CyclotomicField5) => CF5.mul(CF5.add(z, neg_b), r);
  // const real = (z: CF5.CyclotomicField5) => CF5.mul_coeff(CF5.add(z, CF5.conj(z)), Rational.make(1n, 2n));
  // const imag = (z: CF5.CyclotomicField5) => CF5.mul_coeff(CF5.add(z, CF5.neg(CF5.conj(z))), Rational.make(1n, 2n));
  // const a_ = Complex.one; // CF5.toComplex(trans(a));
  // const b_ = Complex.zero; // CF5.toComplex(trans(b));
  // const c_ = CF5.toComplex(trans(c));
  // const bl_ = CF5.toComplex(trans(bbox.bl));
  // const tr_ = CF5.toComplex(trans(bbox.tr));
  // const br = CF5.add(real(bbox.tr), imag(bbox.bl));
  // const tl = CF5.add(real(bbox.bl), imag(bbox.tr));
  // const br_ = CF5.toComplex(trans(br));
  // const tl_ = CF5.toComplex(trans(tl));
  // return intersectNumeric(a_, b_, c_, bl_, br_, tr_, tl_);
  throw new Error("not implemented");
}

// function intersectNumeric(
//   a: Complex.Complex,
//   b: Complex.Complex,
//   c: Complex.Complex,
//   bl: Complex.Complex,
//   br: Complex.Complex,
//   tr: Complex.Complex,
//   tl: Complex.Complex,
// ): IntersectionResult {
  
//   function check_axis(x: Complex.Complex, y: Complex.Complex): boolean {
//     const neg_x = Complex.neg(x);
//     const r = Complex.inv(Complex.add(y, neg_x));
//     const proj = (a: Complex.Complex) => Complex.mul(Complex.add(a, neg_x), r).real;
//     const a_ = proj(a);
//     const b_ = proj(b);
//     const c_ = proj(c);
//     const bl_ = proj(bl);
//     const tr_ = proj(tr);
//     const br_ = proj(br);
//     const tl_ = proj(tl);
    
//     const tri_min = Math.min(a_, b_, c_);
//     const tri_max = Math.max(a_, b_, c_);
//     const box_min = Math.min(bl_, tr_, br_, tl_);
//     const box_max = Math.max(bl_, tr_, br_, tl_);
    
//     return box_max < tri_min && tri_max < box_min;
//   }
  
//   // checkAxis :: Complex Number -> Complex Number -> Boolean
//   // checkAxis x y = box_max < tri_min && tri_max < box_min
//   //   where
//   //   a' = real ((a - x) / (y - x))
//   //   b' = real ((b - x) / (y - x))
//   //   c' = real ((c - x) / (y - x))
//   //   bl' = real ((bl - x) / (y - x))
//   //   tr' = real ((tr - x) / (y - x))
//   //   br' = real ((br - x) / (y - x))
//   //   tl' = real ((tl - x) / (y - x))
//   //   tri_min = a' `min` b' `min` c'
//   //   tri_max = a' `max` b' `max` c'
//   //   box_min = bl' `min` tr' `min` br' `min` tl'
//   //   box_max = bl' `max` tr' `max` br' `max` tl'
  
//   // if
//   //   contain {a, b, c} bl && contain {a, b, c} br
//   //   && contain {a, b, c} tr && contain {a, b, c} tl
//   // then
//   //   Contain unit
//   // else if
//   //   checkAxis bl br && checkAxis br tr
//   //   && checkAxis a b && checkAxis b c && checkAxis c a
//   // then
//   //   Intersect
//   // else
//   //   Disjoint
//   // where
  
// }
