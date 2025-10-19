import * as CF5 from "./CyclotomicField5";
import * as GF from "./GoldenField";
import * as Rational from "./Rational";
import * as Approx from "./Approx";

export type BBox = {
  readonly bl: CF5.CyclotomicField5,
  readonly tr: CF5.CyclotomicField5,
};

export function make(
  left: Rational.Rational,
  bottom: Rational.Rational,
  right: Rational.Rational,
  top: Rational.Rational,
  eps: bigint = BigInt(1e9),
): BBox {
  const bottom_ = Approx.div_zeta_imag([bottom.numerator, bottom.denominator], true, eps);
  const top_ = Approx.div_zeta_imag([top.numerator, top.denominator], false, eps);
  return Object.freeze({
    bl: CF5.make(left, Rational.make(bottom_[0], bottom_[1]), Rational.zero, Rational.zero),
    tr: CF5.make(right, Rational.make(top_[0], top_[1]), Rational.zero, Rational.zero),
  });
}

export type Triangle = {
  readonly a: CF5.CyclotomicField5,
  readonly b: CF5.CyclotomicField5,
  readonly c: CF5.CyclotomicField5,
};

export enum IntersectionResult {Disjoint, Intersect, Contain}

const real = (z: CF5.CyclotomicField5) => CF5.mul_coeff(CF5.add(z, CF5.conj(z)), Rational.make(1n, 2n));
const imag = (z: CF5.CyclotomicField5) => CF5.mul_coeff(CF5.add(z, CF5.neg(CF5.conj(z))), Rational.make(1n, 2n));

function minGolden(rs: GF.GoldenField[]): GF.GoldenField {
  let r0 = rs[0]!;
  for (const r of rs) {
    if (GF.compare(r0, r) > 0) r0 = r;
  }
  return r0;
}

function maxGolden(rs: GF.GoldenField[]): GF.GoldenField {
  let r0 = rs[0]!;
  for (const r of rs) {
    if (GF.compare(r0, r) < 0) r0 = r;
  }
  return r0;
}

function intersectAlong(
  a: CF5.CyclotomicField5[], b: CF5.CyclotomicField5[],
  x: CF5.CyclotomicField5, y: CF5.CyclotomicField5,
): IntersectionResult {
  const r = CF5.inv(CF5.add(y, CF5.neg(x)));
  const proj = (a: CF5.CyclotomicField5) => CF5.real(CF5.mul(a, r));
  const a_ = a.map(e => proj(e));
  const b_ = b.map(e => proj(e));
  
  const a_min = minGolden(a_);
  const a_max = maxGolden(a_);
  const b_min = minGolden(b_);
  const b_max = maxGolden(b_);
  
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
  const br = CF5.add(real(bbox.tr), imag(bbox.bl));
  const tl = CF5.add(real(bbox.bl), imag(bbox.tr));
  
  const abc = [a, b, c];
  const bltr = [bl, br, tr, tl];

  const ab = intersectAlong(abc, bltr, a, b);
  if (ab === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;
  const bc = intersectAlong(abc, bltr, b, c);
  if (bc === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;
  const ca = intersectAlong(abc, bltr, c, a);
  if (ca === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;

  if (
    ab === IntersectionResult.Contain
    && bc === IntersectionResult.Contain
    && ca === IntersectionResult.Contain
  )
    return IntersectionResult.Contain;

  const b_ = intersectAlong(abc, bltr, bl, br);
  if (b_ === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;
  const r_ = intersectAlong(abc, bltr, br, tr);
  if (r_ === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;
  const t_ = intersectAlong(abc, bltr, tr, tl);
  if (t_ === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;
  const l_ = intersectAlong(abc, bltr, tl, bl);
  if (l_ === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;

  return IntersectionResult.Intersect;
}
