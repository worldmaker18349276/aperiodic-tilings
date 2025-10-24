/// express Penrose half tile in CF5
/// construct tree structure of half tile
/// use BBox to capture visible part
/// update the tree lazily

import * as CF5 from "./CyclotomicField5.js";
import * as BBox from "./BBox.js";
import * as Approx from "./Approx.js";

export class HalfTile {
  public readonly type: HalfTile.Type;
  public readonly tri: BBox.Triangle;

  public constructor(type: HalfTile.Type, tri: BBox.Triangle) {
    this.type = type;
    this.tri = tri;
  }

  private static parity(type: HalfTile.Type): HalfTile.Parity {
    return type & (1 << 0);
  }

  private static shape(type: HalfTile.Type): HalfTile.Shape {
    return type & (1 << 1);
  }

  private static orientation(type: HalfTile.Type): HalfTile.Orientation {
    return type & (1 << 2);
  }

  private static flipOri(value: HalfTile.Orientation): HalfTile.Orientation {
    return value === HalfTile.Orientation.L ? HalfTile.Orientation.R : HalfTile.Orientation.L;
  }

  private static calculateTri(
    ori: HalfTile.Orientation,
    a: CF5.CyclotomicField5,
    b: CF5.CyclotomicField5
  ): CF5.CyclotomicField5 {
    if (ori === HalfTile.Orientation.L) {
      // b + (b - a) * zeta^2
      const z2 = CF5.mul(CF5.zeta, CF5.zeta);
      return CF5.add(
        b,
        CF5.mul(
          CF5.add(b, CF5.neg(a)),
          z2,
        )
      );
    } else {
      // b + (b - a) * zeta^3
      const z3 = CF5.mul(CF5.zeta, CF5.mul(CF5.zeta, CF5.zeta));
      return CF5.add(
        b,
        CF5.mul(
          CF5.add(b, CF5.neg(a)),
          z3,
        )
      );
    }
  }

  public subdivision(): HalfTile[] {
    const p = HalfTile.parity(this.type);
    const s = HalfTile.shape(this.type);
    const o = HalfTile.orientation(this.type);
    if (p === HalfTile.Parity.P3 && s === HalfTile.Shape.X) {
      const d = HalfTile.calculateTri(o, this.tri.a, this.tri.b);
      return [
        new HalfTile(
          HalfTile.Parity.P2 | HalfTile.Shape.X | o,
          {a: d, b: this.tri.c, c: this.tri.a},
        ),
        new HalfTile(
          HalfTile.Parity.P2 | HalfTile.Shape.Y | HalfTile.flipOri(o),
          {a: this.tri.b, b: this.tri.a, c: d},
        ),
      ];
    } else if (p === HalfTile.Parity.P2 && s === HalfTile.Shape.Y) {
      const d = HalfTile.calculateTri(o, this.tri.b, this.tri.c);
      return [
        new HalfTile(
          HalfTile.Parity.P3 | HalfTile.Shape.Y | o,
          {a: this.tri.c, b: d, c: this.tri.b},
        ),
        new HalfTile(
          HalfTile.Parity.P3 | HalfTile.Shape.X | o,
          {a: d, b: this.tri.c, c: this.tri.a},
        ),
      ];
    } else if (p === HalfTile.Parity.P3) {
      return [
        new HalfTile(
          HalfTile.Parity.P2 | s | o,
          this.tri,
        ),
      ];
    } else if (p === HalfTile.Parity.P2) {
      return [
        new HalfTile(
          HalfTile.Parity.P3 | s | o,
          this.tri,
        ),
      ];
    } else {
      throw new Error("unreachable");
    }
  }

  public static init(): [tile:HalfTile, scale:CF5.CyclotomicField5] {
    // a = |1 + zeta| = sqrt((1 + zeta) (1 + zeta^4))
    // b = |1 + zeta^2| = sqrt((1 + zeta^3) (1 + zeta^2))
    // r = b / a = |1 + zeta^2||1 + zeta| / (1 + zeta)(1 + zeta^4) = 1 / (1 + zeta)(1 + zeta^4)
    // zoom_P3XL_8step = b^2 / a^2 = r^2
    // shift_P3XL_8step = r zeta^4 + r^2 zeta^2
    // center_P3XL = shift_P3XL_8step + zoom_P3XL_8step * center_P3XL
    const z = CF5.zeta;
    const z2 = CF5.mul(z, z);
    const z3 = CF5.mul(z2, z);
    const z4 = CF5.mul(z2, z2);
    const r = CF5.inv(CF5.mul(CF5.add(CF5.one, z), CF5.add(CF5.one, z4)));
    const r2 = CF5.mul(r, r);
    const zoom_P3XL_8step = r2;
    const shift_P3XL_8step = CF5.add(CF5.mul(r, z4), CF5.mul(r2, z2));
    const center_P3XL = CF5.mul(shift_P3XL_8step, CF5.inv(CF5.add(CF5.one, CF5.neg(zoom_P3XL_8step))));
    
    const a = CF5.neg(center_P3XL);
    const b = CF5.add(z3, CF5.neg(center_P3XL));
    const c = CF5.add(CF5.neg(z2), CF5.neg(center_P3XL));
    return [new HalfTile(HalfTile.Type.P3XL, Object.freeze({a, b, c})), zoom_P3XL_8step];
  }
}

export namespace HalfTile {
  export enum Parity {P2 = 0, P3 = 1 << 0}
  // X: flat triangle, a is top, bc is bottom
  // Y: tall triangle, a is top, bc is bottom
  export enum Shape {X = 0, Y = 1 << 1}
  export enum Orientation {L = 0, R = 1 << 2}
  export enum Type {
    P2XL = Parity.P2 | Shape.X | Orientation.L,
    P2XR = Parity.P2 | Shape.X | Orientation.R,
    P2YL = Parity.P2 | Shape.Y | Orientation.L,
    P2YR = Parity.P2 | Shape.Y | Orientation.R,
    P3XL = Parity.P3 | Shape.X | Orientation.L,
    P3XR = Parity.P3 | Shape.X | Orientation.R,
    P3YL = Parity.P3 | Shape.Y | Orientation.L,
    P3YR = Parity.P3 | Shape.Y | Orientation.R,
  }
  export const paths = Object.freeze([
    HalfTile.Type.P2YR,
    HalfTile.Type.P3YR,
    HalfTile.Type.P2YR,
    HalfTile.Type.P3XR,
    HalfTile.Type.P2YL,
    HalfTile.Type.P3YL,
    HalfTile.Type.P2YL,
    HalfTile.Type.P3XL
  ]);
}

type Tree<A> = {value: A, children: Tree<A>[]};

export class PenroseTree {
  public level: number;
  public root: Tree<HalfTile>;

  public constructor(bound: BBox.BBox) {
    const [tile0, zoom_P3XL] = HalfTile.init();
    const scale0 = CF5.inv(zoom_P3XL);
    let level = 0;
    let tri = tile0.tri;
    while (BBox.intersect(tri, bound) !== BBox.IntersectionResult.Contain) {
      level += 1;
      tri = Object.freeze({
        a: CF5.mul(tri.a, scale0),
        b: CF5.mul(tri.b, scale0),
        c: CF5.mul(tri.c, scale0),
      });
    }
    const tile = new HalfTile(tile0.type, tri);
    this.level = level;
    this.root = {value: tile, children: []};
  }

  private follow(path: HalfTile.Type[]): Tree<HalfTile> | undefined {
    let node = this.root;
    for (const t of path) {
      const subnode = node.children.find(tile => tile.value.type === t);
      if (subnode === undefined) return undefined;
      node = subnode;
    }
    return node;
  }
  
  private static intersect(tree: Tree<HalfTile>, bound: BBox.BBox): [BBox.IntersectionResult, HalfTile.Type[]] {
    const res = BBox.intersect(tree.value.tri, bound);
    if (res !== BBox.IntersectionResult.Contain) return [res, []];
    for (const child of tree.children) {
      const subres = PenroseTree.intersect(child, bound);
      if (subres[0] !== BBox.IntersectionResult.Contain) continue;
      const path = [child.value.type, ...subres[1]];
      return [res, path];
    }
    return [res, []];
  }

  private cherrypick(path: HalfTile.Type[], subtree: Tree<HalfTile>) {
    if (path.length === 0) {
      this.root = subtree;
      return;
    }
    let node = this.root;
    for (const t of path.slice(0, path.length-1)) {
      if (node.children.length === 0) {
        node.children = node.value.subdivision().map(value => ({value, children: []}));
      }
      const subnode = node.children.find(child => child.value.type === t);
      if (subnode === undefined) {
        throw new Error("invalid path");
      }
      node = subnode;
    }
    {
      const t = path[path.length-1]!;
      if (node.children.length === 0) {
        node.children = node.value.subdivision().map(value => ({value, children: []}));
      }
      const subnode = node.children.find(child => child.value.type === t);
      if (subnode === undefined) {
        throw new Error("invalid path");
      }
      const i = node.children.indexOf(subnode);
      node.children[i] = subtree;
    }
  }

  private static refine_(tree: Tree<HalfTile>, depth: number, bound: BBox.BBox) {
    if (depth === 0) return;
    const res = BBox.intersect(tree.value.tri, bound);
    if (res === BBox.IntersectionResult.Disjoint) {
      tree.children = [];
      return;
    }
    if (tree.children.length === 0) {
      tree.children = tree.value.subdivision().map(value => ({value, children: []}));
    }
    for (const child of tree.children) {
      PenroseTree.refine_(child, depth-1, bound);
    }
  }

  private refine(bound: BBox.BBox) {
    PenroseTree.refine_(this.root, this.level * 8, bound);
  }

  public update(bound: BBox.BBox) {
    const res = PenroseTree.intersect(this.root, bound);
    if (res[0] === BBox.IntersectionResult.Disjoint) {
      const tree_ = new PenroseTree(bound);
      tree_.refine(bound);
      this.level = tree_.level;
      this.root = tree_.root;
    } else if (res[0] === BBox.IntersectionResult.Contain) {
      let path = res[1];
      {
        let i = 0;
        for (; i < path.length; i++) {
          if (path[i]! !== HalfTile.paths[i % 8]!) break;
        }
        i = Math.floor(i / 8) * 8;
        path = path.slice(0, i);
      }
      this.level -= path.length / 8;
      this.root = this.follow(path)!;
      this.refine(bound);
    } else if (res[0] === BBox.IntersectionResult.Intersect) {
      this.refine(bound);
      const tree_ = new PenroseTree(bound);
      tree_.refine(bound);

      const path = Array.from({length:tree_.level - this.level}, _ => HalfTile.paths).flat(1);
      tree_.cherrypick(path, this.root);
      this.level = tree_.level;
      this.root = tree_.root;
    }
  }
  
  public getTriangles(bound: BBox.BBox, denominator: bigint = BigInt(1e9)): {a:Approx.Complex, b:Approx.Complex, c:Approx.Complex}[] {
    // get leaves
    let nodes = [this.root];
    for (let level = this.level; level > 0; level--) {
      nodes = nodes.flatMap(node => node.children);
    }
    return nodes.map(node => node.value.tri)
      .map(({a, b, c}) => {
        return {
          a: Approx.approxCyclotomicField5(a, bound, denominator),
          b: Approx.approxCyclotomicField5(b, bound, denominator),
          c: Approx.approxCyclotomicField5(c, bound, denominator),
        };
      });
  }
}
