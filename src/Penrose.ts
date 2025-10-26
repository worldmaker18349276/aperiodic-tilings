/// express Penrose half tile in CF5
/// construct tree structure of half tile
/// use BBox to capture visible part
/// update the tree lazily

import * as CF5 from "./CyclotomicField5.js";
import * as BBox from "./BBox.js";
import * as Approx from "./Approx.js";

export class HalfTile {
  public state: HalfTile.State;
  public readonly type: HalfTile.Type;
  public readonly tri: BBox.TriangleCached;

  public constructor(type: HalfTile.Type, tri: BBox.TriangleCached) {
    this.state = HalfTile.State.Empty;
    this.type = type;
    this.tri = tri;
  }

  static make(type: HalfTile.Type, bc: BBox.Direction, tri: BBox.Triangle): HalfTile {
    let dir: Readonly<{bc:BBox.Direction, ca:BBox.Direction, ab:BBox.Direction}>;
    {
      const sign = (HalfTile.#orientation(type) === HalfTile.Orientation.L ? +1 : -1);
      const n = HalfTile.#shape(type) === HalfTile.Shape.X ? 2 : -1;
      let ca = BBox.rotate(bc, n * sign);
      let ab = BBox.rotate(bc, -n * sign);
      dir = Object.freeze({bc, ca, ab});
    }
    return new HalfTile(type, BBox.makeTriangle(tri, dir));
  }

  static #parity(type: HalfTile.Type): HalfTile.Parity {
    return type & (1 << 0);
  }

  static #shape(type: HalfTile.Type): HalfTile.Shape {
    return type & (1 << 1);
  }

  static #orientation(type: HalfTile.Type): HalfTile.Orientation {
    return type & (1 << 2);
  }

  static #flipOri(value: HalfTile.Orientation): HalfTile.Orientation {
    return value === HalfTile.Orientation.L ? HalfTile.Orientation.R : HalfTile.Orientation.L;
  }

  static #calculateTri(
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
    const p = HalfTile.#parity(this.type);
    const s = HalfTile.#shape(this.type);
    const o = HalfTile.#orientation(this.type);
    const o_sign = o === HalfTile.Orientation.L ? +1 : -1;
    if (p === HalfTile.Parity.P3 && s === HalfTile.Shape.X) {
      const d = HalfTile.#calculateTri(o, this.tri.tri.a, this.tri.tri.b);
      return [
        HalfTile.make(
          HalfTile.Parity.P2 | HalfTile.Shape.X | o,
          BBox.rotate(this.tri.dir.bc, 2 * o_sign),
          {a: d, b: this.tri.tri.c, c: this.tri.tri.a},
        ),
        HalfTile.make(
          HalfTile.Parity.P2 | HalfTile.Shape.Y | HalfTile.#flipOri(o),
          BBox.rotate(this.tri.dir.bc, -1 * o_sign),
          {a: this.tri.tri.b, b: this.tri.tri.a, c: d},
        ),
      ];
    } else if (p === HalfTile.Parity.P2 && s === HalfTile.Shape.Y) {
      const d = HalfTile.#calculateTri(o, this.tri.tri.b, this.tri.tri.c);
      return [
        HalfTile.make(
          HalfTile.Parity.P3 | HalfTile.Shape.Y | o,
          BBox.rotate(this.tri.dir.bc, 1 * o_sign),
          {a: this.tri.tri.c, b: d, c: this.tri.tri.b},
        ),
        HalfTile.make(
          HalfTile.Parity.P3 | HalfTile.Shape.X | o,
          BBox.rotate(this.tri.dir.bc, -1 * o_sign),
          {a: d, b: this.tri.tri.c, c: this.tri.tri.a},
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
}

export namespace HalfTile {
  export enum State {Full, Partial, Empty}
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

  static #spine = (() => {
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

    const tile = HalfTile.make(
      HalfTile.Type.P3XL,
      0 as BBox.Direction,
      Object.freeze({a: CF5.zero, b: z3, c: CF5.neg(z2)}),
    );
    const scale = CF5.inv(zoom_P3XL_8step); // = 2 - 3 zeta^2 - 3 zeta^-2 = 2 + 3 phi = 6.8541
    const offset = CF5.mul(center_P3XL, CF5.add(CF5.one, CF5.neg(scale))); // = zeta - zeta^-1 = 1.1756 i
    
    return { tiles: [tile], offset, scale };
  })();
  
  static #getSpineTile(level: number): HalfTile {
    if (PenroseTree.#spine.tiles[level] === undefined) {
      for (let l = PenroseTree.#spine.tiles.length; l <= level; l++) {
        const prev = PenroseTree.#spine.tiles[l-1]!;
        const tri = Object.freeze({
            a: CF5.add(CF5.mul(prev.tri.tri.a, PenroseTree.#spine.scale), PenroseTree.#spine.offset),
            b: CF5.add(CF5.mul(prev.tri.tri.b, PenroseTree.#spine.scale), PenroseTree.#spine.offset),
            c: CF5.add(CF5.mul(prev.tri.tri.c, PenroseTree.#spine.scale), PenroseTree.#spine.offset),
          });

        PenroseTree.#spine.tiles.push(
          new HalfTile(PenroseTree.#spine.tiles[0]!.type, BBox.makeTriangle(tri, prev.tri.dir))
        );
      }
    }
    return PenroseTree.#spine.tiles[level]!;
  }

  public constructor(bound: BBox.BBox) {
    const bound_cached = BBox.makeCached(bound);
    let level = 0;
    let tile = PenroseTree.#getSpineTile(level);
    while (BBox.intersectCached(tile.tri, bound_cached) !== BBox.IntersectionResult.Contain) {
      level += 1;
      tile = PenroseTree.#getSpineTile(level);
    }
    this.level = level;
    this.root = {value: tile, children: []};
  }

  // intersect tree and given bound,
  // if it is Contain, find the subtree that just contains this bound.
  static #intersect(tree: Tree<HalfTile>, bound: BBox.BBoxCached): [BBox.IntersectionResult, HalfTile.Type[]] {
    const res = BBox.intersectCached(tree.value.tri, bound);

    const path: HalfTile.Type[] = [];
    if (res === BBox.IntersectionResult.Contain) {
      let node = tree;
      while (true) {
        let found = false;
        for (const child of node.children) {
          const subres = BBox.intersectCached(child.value.tri, bound);
          if (subres === BBox.IntersectionResult.Contain) {
            path.push(child.value.type);
            node = child;
            found = true;
            break;
          }
        }
        if (!found) break;
      }
    }
    return [res, path];
  }

  #getSubtree(path: HalfTile.Type[]): Tree<HalfTile> | undefined {
    let node = this.root;
    for (const t of path) {
      const subnode = node.children.find(tile => tile.value.type === t);
      if (subnode === undefined) return undefined;
      node = subnode;
    }
    return node;
  }
  
  // subdivide along the path if no children
  #setSubtree(path: HalfTile.Type[], subtree: Tree<HalfTile>) {
    if (path.length === 0) {
      this.root = subtree;
      return;
    }
    let parent = this.root;
    let node = this.root;
    for (const t of path) {
      if (node.children.length === 0) {
        node.children = node.value.subdivision().map(value => ({value, children: []}));
      }
      const subnode = node.children.find(child => child.value.type === t);
      if (subnode === undefined) {
        throw new Error("invalid path");
      }
      parent = node;
      node = subnode;
    }
    parent.children[parent.children.indexOf(node)] = subtree;
  }

  #refine(bound: BBox.BBoxCached) {
    type Stack = [node:Tree<HalfTile>, depth:number, is_contained:boolean];
    const stack = [[this.root, this.level * 8, false] as Stack];
    while (stack.length > 0) {
      const [node, depth, is_contained] = stack.pop()!;
      const res = is_contained ? BBox.IntersectionResult.BeContained : BBox.intersectCached(node.value.tri, bound);

      if (depth === 0) {
        node.value.state =
          res === BBox.IntersectionResult.Disjoint ?
            HalfTile.State.Empty
          : res === BBox.IntersectionResult.BeContained ?
            HalfTile.State.Full
          : 
            HalfTile.State.Partial;
        continue;
      }

      if (res === BBox.IntersectionResult.Disjoint) {
        // trim this subtree
        node.value.state = HalfTile.State.Empty;
        node.children = [];
        continue;
      }

      if (res === BBox.IntersectionResult.BeContained && node.value.state === HalfTile.State.Full) {
        // already done
        continue;
      }

      // subdivide if absent
      if (node.children.length === 0) {
        node.value.state = res === BBox.IntersectionResult.BeContained ? HalfTile.State.Full : HalfTile.State.Partial;
        node.children = node.value.subdivision().map(value => ({value, children: []}));
      }

      for (const child of node.children) {
        stack.push([child, depth-1, res === BBox.IntersectionResult.BeContained]);
      }
    }
  }

  public update(bound: BBox.BBox) {
    const bound_cached = BBox.makeCached(bound);

    const res = PenroseTree.#intersect(this.root, bound_cached);
    switch (res[0]) {
    case BBox.IntersectionResult.Disjoint:
    {
      // rebuild the whole tree
      const tree_ = new PenroseTree(bound);
      this.level = tree_.level;
      this.root = tree_.root;
    }
    break;
    case BBox.IntersectionResult.Contain:
    {
      // shorten the tree
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
      this.root = this.#getSubtree(path)!;
    }
    break;
    case BBox.IntersectionResult.Intersect:
    case BBox.IntersectionResult.BeContained:
    {
      // lengthen the tree
      const tree_ = new PenroseTree(bound);
      const path = Array.from({length:tree_.level - this.level}, _ => HalfTile.paths).flat(1);
      tree_.#setSubtree(path, this.root);
      this.level = tree_.level;
      this.root = tree_.root;
    }
    break;
    default:
      throw new Error("unreachable");
    }

    this.#refine(bound_cached);
  }
  
  public getTriangles(bound: BBox.BBox, level = 0, denominator: bigint = BigInt(1e9)): {a:Approx.Complex, b:Approx.Complex, c:Approx.Complex}[] {
    // get leaves
    let nodes = [this.root];
    for (let l = this.level * 8; l > level; l--) {
      nodes = nodes.flatMap(node => node.children);
    }
    return nodes
      .filter(node => node.value.state !== HalfTile.State.Empty)
      .map(node => node.value.tri.tri)
      .map(({a, b, c}) => {
        return {
          a: Approx.approxCyclotomicField5(a, bound, denominator),
          b: Approx.approxCyclotomicField5(b, bound, denominator),
          c: Approx.approxCyclotomicField5(c, bound, denominator),
        };
      });
  }
}
