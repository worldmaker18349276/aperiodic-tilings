/// bounding box on a complex plane, represented as CyclotomicField5.
/// it provides a method to check intersection relation between a triangle
/// (also represented as CyclotomicField5) and a bounding box precisely.

import * as CF5 from "./CyclotomicField5.js";
import * as GF from "./GoldenField.js";
import * as Rational from "./Rational.js";

export type BBox = {
  readonly bl: CF5.CyclotomicField5,
  readonly tr: CF5.CyclotomicField5,
};

export function make(bl: CF5.CyclotomicField5, tr: CF5.CyclotomicField5): BBox {
  return Object.freeze({bl, tr});
}

export type Triangle = {
  readonly a: CF5.CyclotomicField5,
  readonly b: CF5.CyclotomicField5,
  readonly c: CF5.CyclotomicField5,
};

export enum IntersectionResult {Disjoint, Intersect, Contain}

const half = Rational.make(1n, 2n);
function real_imag(z: CF5.CyclotomicField5): [CF5.CyclotomicField5, CF5.CyclotomicField5] {
  const z_ = CF5.conj(z);
  return [
    CF5.mulCoeff(CF5.add(z, z_), half),
    CF5.mulCoeff(CF5.add(z, CF5.neg(z_)), half),
  ];
}

// -Im(zeta) i = -i/2 sqrt(phi sqrt(5)) = -sqrt((5 + sqrt(5))/8) i = -0.9510 i
export const neg_zeta_imag = CF5.make_(
  Rational.zero,
  Rational.make(-1n, 2n),
  Rational.zero,
  Rational.zero,
  Rational.make(1n, 2n),
);

function intersectAlong(
  a: CF5.CyclotomicField5[], b: CF5.CyclotomicField5[],
  axis: CF5.CyclotomicField5,
): IntersectionResult {
  const a_ = a.map(e => CF5.real(axis === CF5.one ? e : CF5.mul(e, axis)));
  const b_ = b.map(e => CF5.real(axis === CF5.one ? e : CF5.mul(e, axis)));
  
  const a_min = a_.reduce((lhs, rhs) => GF.compare(lhs, rhs) > 0 ? rhs : lhs);
  const a_max = a_.reduce((lhs, rhs) => GF.compare(lhs, rhs) > 0 ? lhs : rhs);
  const b_min = b_.reduce((lhs, rhs) => GF.compare(lhs, rhs) > 0 ? rhs : lhs);
  const b_max = b_.reduce((lhs, rhs) => GF.compare(lhs, rhs) > 0 ? lhs : rhs);
  
  if (GF.compare(b_max, a_min) < 0 || GF.compare(a_max, b_min) < 0) {
    return IntersectionResult.Disjoint;
  }
  if (GF.compare(a_min, b_min) < 0 && GF.compare(b_max, a_max) < 0) {
    return IntersectionResult.Contain;
  }
  return IntersectionResult.Intersect;
}

export function intersect({a, b, c}: Triangle, bbox: BBox): IntersectionResult {
  const bl = bbox.bl;
  const tr = bbox.tr;
  const [bl_real, bl_imag] = real_imag(bbox.bl);
  const [tr_real, tr_imag] = real_imag(bbox.tr);
  const br = CF5.add(tr_real, bl_imag);
  const tl = CF5.add(bl_real, tr_imag);
  
  const abc = [a, b, c];
  const bltr = [bl, br, tr, tl];

  const ab_axis = CF5.mul(neg_zeta_imag, CF5.inv(CF5.add(b, CF5.neg(a))));
  const ab = intersectAlong(abc, bltr, ab_axis);
  if (ab === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;
  const bc_axis = CF5.mul(neg_zeta_imag, CF5.inv(CF5.add(c, CF5.neg(b))));
  const bc = intersectAlong(abc, bltr, bc_axis);
  if (bc === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;
  const ca_axis = CF5.mul(neg_zeta_imag, CF5.inv(CF5.add(a, CF5.neg(c))));
  const ca = intersectAlong(abc, bltr, ca_axis);
  if (ca === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;

  if (
    ab === IntersectionResult.Contain
    && bc === IntersectionResult.Contain
    && ca === IntersectionResult.Contain
  )
    return IntersectionResult.Contain;

  const x = intersectAlong(abc, bltr, CF5.one);
  if (x === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;
  const y = intersectAlong(abc, bltr, neg_zeta_imag);
  if (y === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;

  return IntersectionResult.Intersect;
}
