/// bounding box on a complex plane, represented as CyclotomicField5.
/// it provides a method to check intersection relation between a triangle
/// (also represented as CyclotomicField5) and a bounding box precisely.

import * as CF5 from "./CyclotomicField5.js";
import * as GF from "./GoldenField.js";


// direction of line: 0 ~ 4 => zeta^n; 5 => i
export type Direction = 0 | 1 | 2 | 3 | 4 | 5;

export function rotate(d: Direction, n: number): Direction {
  return ((5 + (d + n) % 5) % 5) as Direction;
}

// perpendicular direction of Direction
const axes = [CF5.one, CF5.zeta4, CF5.zeta3, CF5.zeta2, CF5.zeta]
  .map(z => CF5.mul(CF5.neg_2_zeta_imag, z))
  .concat([CF5.one]);

export type Projected = Readonly<{min: GF.GoldenFieldRational, max: GF.GoldenFieldRational}>;

function project(points: CF5.CyclotomicField5[], denominator: bigint, direction: Direction): Projected {
  const points_num = points.map(p => CF5.real(CF5.mul(p, axes[direction]!)));
  // points_num.every(v => v.denominator === 4n);

  const min_num = points_num.reduce((lhs, rhs) => GF.compare(lhs.numerator, rhs.numerator) > 0 ? rhs : lhs);
  const max_num = points_num.reduce((lhs, rhs) => GF.compare(lhs.numerator, rhs.numerator) > 0 ? lhs : rhs);
  const min = GF.makeRational(min_num.numerator, min_num.denominator * denominator);
  const max = GF.makeRational(max_num.numerator, max_num.denominator * denominator);

  return Object.freeze({min, max});
}

export type BBox = Readonly<{
  bl: CF5.CyclotomicField5,
  tr: CF5.CyclotomicField5,
}>;

export type BBoxRational = Readonly<{
  numerator: BBox,
  denominator: bigint,
}>;

export type BBoxCached = {
  bbox: BBoxRational,
  bbox_projected: Projected[],
};

export function make(bl: CF5.CyclotomicField5, tr: CF5.CyclotomicField5, denominator: bigint): BBoxRational {
  return Object.freeze({numerator: Object.freeze({bl, tr}), denominator});
}

export function makeCached(bbox: BBoxRational): BBoxCached {
  const bl = CF5.mulCoeff(bbox.numerator.bl, 2n);
  const tr = CF5.mulCoeff(bbox.numerator.tr, 2n);
  const [bl_real, bl_imag] = CF5.real_imag_2(bbox.numerator.bl);
  const [tr_real, tr_imag] = CF5.real_imag_2(bbox.numerator.tr);
  const br = CF5.add(bl_imag, tr_real);
  const tl = CF5.add(tr_imag, bl_real);

  const bbox_projected = ([0, 1, 2, 3, 4, 5] as Direction[])
    .map(d => project([bl, br, tr, tl], 2n * bbox.denominator, d));
  
  return { bbox, bbox_projected };
}

function projectBBox(bbox: BBoxCached, dir: Direction): Projected {
  return bbox.bbox_projected[dir]!;
}


export type Triangle = Readonly<{
  a: CF5.CyclotomicField5,
  b: CF5.CyclotomicField5,
  c: CF5.CyclotomicField5,
}>;

export type TriangleCached = {
  tri: Triangle,
  dir: Readonly<{bc: Direction, ca: Direction, ab: Direction}>,
  tri_projected: Projected[],
};

function assert(cond: () => boolean) {
  if (!cond()) throw new Error("assertion fail");
}

export function makeTriangle(
  tri: Triangle,
  dir: {bc: Direction, ca: Direction, ab: Direction},
): TriangleCached {
  assert(() => {
    const bc = project([CF5.add(tri.c, CF5.neg(tri.b))], 1n, dir.bc).min.numerator;
    const ca = project([CF5.add(tri.a, CF5.neg(tri.c))], 1n, dir.ca).min.numerator;
    const ab = project([CF5.add(tri.b, CF5.neg(tri.a))], 1n, dir.ab).min.numerator;
    return [bc, ca, ab].every(e => GF.eq(e, GF.zero));
  });

  tri = Object.freeze({a: tri.a, b: tri.b, c: tri.c});
  dir = Object.freeze({bc: dir.bc, ca: dir.ca, ab: dir.ab});
  return { tri, dir, tri_projected: [] };
}

function projectTriangle(tri: TriangleCached, dir: Direction): Projected {
  if (tri.tri_projected[dir] === undefined) {
    tri.tri_projected[dir] = project([tri.tri.a, tri.tri.b, tri.tri.c], 1n, dir);
  }
  return tri.tri_projected[dir];
}


export enum IntersectionResult {Disjoint, Intersect, Contain, BeContained}

function intersectProjected(a: Projected, b: Projected): IntersectionResult {
  if (GF.compareRational(b.max, a.min) < 0 || GF.compareRational(a.max, b.min) < 0) {
    return IntersectionResult.Disjoint;
  } else if (GF.compareRational(a.min, b.min) < 0 && GF.compareRational(b.max, a.max) < 0) {
    return IntersectionResult.Contain;
  } else if (GF.compareRational(b.min, a.min) < 0 && GF.compareRational(a.max, b.max) < 0) {
    return IntersectionResult.BeContained;
  } else {
    return IntersectionResult.Intersect;
  }
}

export function intersectCached(tri: TriangleCached, bbox: BBoxCached): IntersectionResult {
  const tri_dirs = [tri.dir.bc, tri.dir.ca, tri.dir.ab];

  let contain = true;
  let be_contained = true;
  for (const d of tri_dirs) {
    const res = intersectProjected(projectTriangle(tri, d), projectBBox(bbox, d));
    if (res === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;
    contain = contain && res === IntersectionResult.Contain;
    if (d === 0) be_contained = be_contained && res === IntersectionResult.BeContained;
  }
  if (contain) return IntersectionResult.Contain;

  const bbox_dirs = [5 as Direction];
  if (!tri_dirs.includes(0)) bbox_dirs.push(0);
  
  for (const d of bbox_dirs) {
    const res = intersectProjected(projectTriangle(tri, d), projectBBox(bbox, d));
    if (res === IntersectionResult.Disjoint) return IntersectionResult.Disjoint;
    be_contained = be_contained && res === IntersectionResult.BeContained;
  }
  if (be_contained) return IntersectionResult.BeContained;

  return IntersectionResult.Intersect;
}
