/// bounding box on a complex plane, represented as CyclotomicField5.
/// it provides a method to check intersection relation between a triangle
/// (also represented as CyclotomicField5) and a bounding box precisely.

import * as CF5 from "./CyclotomicField5.js";
import * as GF from "./GoldenField.js";
import * as Rational from "./Rational.js";


// direction of line: 0 ~ 4 => zeta^n; 5 => i
export type Direction = 0 | 1 | 2 | 3 | 4 | 5;

export function rotate(d: Direction, n: number): Direction {
  return ((5 + (d + n) % 5) % 5) as Direction;
}

// perpendicular direction of Direction
const axes = [CF5.one, CF5.zeta, CF5.zeta2, CF5.zeta3, CF5.zeta4, CF5.neg_zeta_imag]
  .map(z => CF5.mul(CF5.neg_zeta_imag, CF5.inv(z)));

const half = Rational.make(1n, 2n);
function real_imag(z: CF5.CyclotomicField5): [CF5.CyclotomicField5, CF5.CyclotomicField5] {
  const z_ = CF5.conj(z);
  return [
    CF5.mulCoeff(CF5.add(z, z_), half),
    CF5.mulCoeff(CF5.add(z, CF5.neg(z_)), half),
  ];
}

export type Projected = Readonly<{min: GF.GoldenField, max: GF.GoldenField}>;

function project(points: CF5.CyclotomicField5[], direction: Direction): Projected {
  const points_ = points.map(p => CF5.real(CF5.mul(p, axes[direction]!)));
  return Object.freeze({
    min: points_.reduce((lhs, rhs) => GF.compare(lhs, rhs) > 0 ? rhs : lhs),
    max: points_.reduce((lhs, rhs) => GF.compare(lhs, rhs) > 0 ? lhs : rhs),
  });
}

export type BBox = {
  readonly bl: CF5.CyclotomicField5,
  readonly tr: CF5.CyclotomicField5,
};

export type BBoxCached = {
  bbox: BBox,
  bbox_projected: Projected[],
};

export function make(bl: CF5.CyclotomicField5, tr: CF5.CyclotomicField5): BBox {
  return Object.freeze({bl, tr});
}

export function makeCached(bbox: BBox): BBoxCached {
  const bl = bbox.bl;
  const tr = bbox.tr;
  const [bl_real, bl_imag] = real_imag(bbox.bl);
  const [tr_real, tr_imag] = real_imag(bbox.tr);
  const br = CF5.add(bl_imag, tr_real);
  const tl = CF5.add(tr_imag, bl_real);

  const bbox_projected = ([0, 1, 2, 3, 4, 5] as Direction[])
    .map(d => project([bl, br, tr, tl], d));
  
  return { bbox, bbox_projected };
}

function projectBBox(bbox: BBoxCached, dir: Direction): Projected {
  return bbox.bbox_projected[dir]!;
}


export type Triangle = {
  readonly a: CF5.CyclotomicField5,
  readonly b: CF5.CyclotomicField5,
  readonly c: CF5.CyclotomicField5,
};

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
  dir: Readonly<{bc: Direction, ca: Direction, ab: Direction}>,
): TriangleCached {
  assert(() => {
    const bc = project([CF5.add(tri.c, CF5.neg(tri.b))], dir.bc).min;
    const ca = project([CF5.add(tri.a, CF5.neg(tri.c))], dir.ca).min;
    const ab = project([CF5.add(tri.b, CF5.neg(tri.a))], dir.ab).min;
    return [bc, ca, ab].every(e => GF.eq(e, GF.zero));
  });

  return { tri, dir, tri_projected: [] };
}

function projectTriangle(tri: TriangleCached, dir: Direction): Projected {
  if (tri.tri_projected[dir] === undefined) {
    tri.tri_projected[dir] = project([tri.tri.a, tri.tri.b, tri.tri.c], dir);
  }
  return tri.tri_projected[dir];
}


export enum IntersectionResult {Disjoint, Intersect, Contain, BeContained}

function intersectProjected(a: Projected, b: Projected): IntersectionResult {
  if (GF.compare(b.max, a.min) < 0 || GF.compare(a.max, b.min) < 0) {
    return IntersectionResult.Disjoint;
  } else if (GF.compare(a.min, b.min) < 0 && GF.compare(b.max, a.max) < 0) {
    return IntersectionResult.Contain;
  } else if (GF.compare(b.min, a.min) < 0 && GF.compare(a.max, b.max) < 0) {
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
