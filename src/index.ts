import * as Penrose from "./Penrose.js";
import * as Rational from "./Rational.js";
import * as BBox from "./BBox.js";
import * as Approx from "./Approx.js";

type Triangle = {a: Approx.Complex, b: Approx.Complex, c: Approx.Complex};

export class State {
  #draw_level: number = 0;
  #margin: number;
  #center: [Rational.Rational, Rational.Rational] = [Rational.zero, Rational.zero];
  #view_width: Rational.Rational = Rational.make(10n, 1n);
  #unit: Rational.Rational = Rational.one;
  #precision_per_pixel: bigint = 128n;

  #drag_state = {
    dragging: false,
    lastX: 0,
    lastY: 0,
  };
  #zoom_state = {
    deltaY: 0,
    deltaY_step: 50,
    zoom_delay: 1000,
    when: Date.now(),
    rate: Rational.make(19n, 20n),
  };
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;

  #tree: Penrose.PenroseTree;

  getWidth(): bigint {
    return BigInt(this.#canvas.clientWidth);
  }

  getHeight(): bigint {
    return BigInt(this.#canvas.clientHeight);
  }

  #updateUnit() {
    const width_pixel = this.getWidth();
    const unit = Rational.mul(this.#view_width, Rational.make(1n, this.#precision_per_pixel * width_pixel));
    const unit_i = Rational.integer(unit);
    if (unit_i >= 1n)
      this.#unit = Rational.make(unit_i, 1n);
    else
      this.#unit = Rational.make(1n, Rational.integer(Rational.inv(unit)) + 1n);
  }
  
  #approx(r: Rational.Rational): Rational.Rational {
    const unit_inv = Rational.inv(this.#unit);
    return Rational.mul(this.#unit, Rational.make(Rational.integer(Rational.mul(r, unit_inv)), 1n));
  }
  
  getCenter(): [Rational.Rational, Rational.Rational] {
    return [this.#approx(this.#center[0]), this.#approx(this.#center[1])];
  }
  
  getBound(): BBox.BBoxRational {
    const half_view_width = Rational.mul(this.#view_width, Rational.make(1n, 2n));
    const half_view_height = Rational.mul(
      this.#view_width,
      Rational.make(this.getHeight(), 2n * this.getWidth()),
    );
    const bl = [
      Rational.add(this.#center[0], Rational.neg(half_view_width)),
      Rational.add(this.#center[1], Rational.neg(half_view_height)),
    ] as const;
    const tr = [
      Rational.add(this.#center[0], half_view_width),
      Rational.add(this.#center[1], half_view_height),
    ] as const;
    const unit_inv = Rational.inv(this.#unit);
    const l = Rational.integer(Rational.mul(bl[0], unit_inv));
    const b = Rational.integer(Rational.mul(bl[1], unit_inv));
    const r = Rational.integer(Rational.mul(tr[0], unit_inv)) + 1n;
    const t = Rational.integer(Rational.mul(tr[1], unit_inv)) + 1n;
    return Approx.approxBBox(l, b, r, t, this.#unit);
  }
  
  constructor(canvas: HTMLCanvasElement, margin=0.0) {
    this.#margin = margin;
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d")!;

    this.#updateUnit();
    const bound = this.getBound();
    this.#tree = new Penrose.PenroseTree(bound);
    this.#tree.update(bound);
    this.#draw(bound);

    this.#canvas.onmousedown = e => {
      this.#drag_state.dragging = true;
      this.#drag_state.lastX = e.offsetX;
      this.#drag_state.lastY = e.offsetY;
    };
    this.#canvas.onmouseup = e => this.#drag_state.dragging = false;
    this.#canvas.onmouseleave = e => this.#drag_state.dragging = false;
    this.#canvas.onmousemove = e => {
      if (this.#drag_state.dragging) {
        const lastX = this.#drag_state.lastX;
        const lastY = this.#drag_state.lastY;
        this.#drag_state.lastX = e.offsetX;
        this.#drag_state.lastY = e.offsetY;
        const dx = BigInt(lastX - e.offsetX);
        const dy = BigInt(lastY - e.offsetY);
        console.log(`move ${dx}, ${dy}`);
        this.move(dx, dy);
      }
    };
    this.#canvas.onwheel = e => {
      e.preventDefault();
      if (Date.now() - this.#zoom_state.when > this.#zoom_state.zoom_delay) this.#zoom_state.deltaY = 0;
      this.#zoom_state.deltaY += e.deltaY;
      const n = Math.round(this.#zoom_state.deltaY / this.#zoom_state.deltaY_step);
      this.#zoom_state.deltaY -= n * this.#zoom_state.deltaY_step;
      this.#zoom_state.when = Date.now();
      if (n === 0) return;
      const n_ = BigInt(n > 0n ? n : -n);
      let zoom = Rational.make(this.#zoom_state.rate.numerator ** n_, this.#zoom_state.rate.denominator ** n_);
      if (e.deltaY > 0) zoom = Rational.inv(zoom);
      console.log(`zoom ${zoom.numerator}/${zoom.denominator}`);
      this.zoom(zoom);
    };
  }
  
  move(dx_pixel: bigint, dy_pixel: bigint) {
    const pixel = Rational.mul(this.#view_width, Rational.make(1n, this.getWidth()));
    const dx = this.#approx(Rational.mul(Rational.make(dx_pixel, 1n), pixel));
    const dy = this.#approx(Rational.mul(Rational.make(dy_pixel, 1n), pixel));
    const center = this.getCenter();
    this.#center = [
      Rational.add(center[0], dx),
      Rational.add(center[1], dy),
    ];
    this.update();
  }

  zoom(zoom: Rational.Rational) {
    this.#view_width = Rational.mul(this.#view_width, Rational.inv(zoom));
    this.#updateUnit();
    this.update();
  }

  update() {
    const bound = this.getBound();
    this.#tree.update(bound);
    this.#draw(bound);
  }

  static #approxTriangles(triangles: BBox.TriangleCached[], bound: BBox.BBoxRational): {a:Approx.Complex, b:Approx.Complex, c:Approx.Complex}[] {
    return triangles
      .map(tri => tri.tri)
      .map(({a, b, c}) => {
        return {
          a: Approx.approxCyclotomicField5(a, bound),
          b: Approx.approxCyclotomicField5(b, bound),
          c: Approx.approxCyclotomicField5(c, bound),
        };
      });
  }
  
  #draw(bound: BBox.BBoxRational) {
    const triangles = State.#approxTriangles(this.#tree.getTriangles(this.#draw_level), bound);
    this.#ctx.clearRect(0, 0, this.#canvas.clientWidth, this.#canvas.clientHeight);
    for (const {a, b, c} of triangles) {
      // fill triangles
      this.#ctx.beginPath();
      this.#ctx.moveTo(...this.#toPixel(a.re, a.im));
      this.#ctx.lineTo(...this.#toPixel(b.re, b.im));
      this.#ctx.lineTo(...this.#toPixel(c.re, c.im));
      this.#ctx.closePath();
      this.#ctx.fillStyle = "#9cf";
      this.#ctx.fill();

      // draw tile borders
      this.#ctx.beginPath();
      this.#ctx.moveTo(...this.#toPixel(c.re, c.im));
      this.#ctx.lineTo(...this.#toPixel(a.re, a.im));
      this.#ctx.lineTo(...this.#toPixel(b.re, b.im));
      this.#ctx.strokeStyle = "#06c";
      this.#ctx.stroke();
    }

    if (this.#margin !== 0.0) {
      // draw previous level
      const triangles_parent = State.#approxTriangles(this.#tree.getTriangles(this.#draw_level + 1), bound);
      for (const {a, b, c} of triangles_parent) {
        // draw parent tile borders as dashed lines
        this.#ctx.beginPath();
        this.#ctx.setLineDash([5, 10]);
        this.#ctx.moveTo(...this.#toPixel(c.re, c.im));
        this.#ctx.lineTo(...this.#toPixel(a.re, a.im));
        this.#ctx.lineTo(...this.#toPixel(b.re, b.im));
        this.#ctx.closePath();
        this.#ctx.strokeStyle = "red";
        this.#ctx.stroke();
        this.#ctx.setLineDash([]);
      }

      // draw boundary as green lines
      this.#ctx.beginPath();
      this.#ctx.moveTo(...this.#toPixel(0, 0));
      this.#ctx.lineTo(...this.#toPixel(1, 0));
      this.#ctx.lineTo(...this.#toPixel(1, 1));
      this.#ctx.lineTo(...this.#toPixel(0, 1));
      this.#ctx.closePath();
      this.#ctx.strokeStyle = "green";
      this.#ctx.stroke();
    }
  }

  #toPixel(x: number, y: number): [number, number] {
    return [
      (x * (1 - this.#margin * 2) + this.#margin) * this.#canvas.clientWidth,
      (y * (1 - this.#margin * 2) + this.#margin) * this.#canvas.clientHeight,
    ]
  }
}

