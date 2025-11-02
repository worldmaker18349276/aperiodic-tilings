import * as Penrose from "./Penrose.js";
import * as Rational from "./Rational.js";
import * as RationalParser from "./RationalParser.js";
import * as BBox from "./BBox.js";
import * as Approx from "./Approx.js";

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
  #x_coordinate: HTMLInputElement;
  #y_coordinate: HTMLInputElement;
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
  
  getPosition(x_pixel: bigint, y_pixel: bigint): [Rational.Rational, Rational.Rational] {
    const width = this.getWidth();
    const height = this.getHeight();
    const view_width = this.#view_width;
    const view_height = Rational.mul(this.#view_width, Rational.make(height, width));
    const x = Rational.add(
      this.#center[0],
      Rational.mul(Rational.add(Rational.make(x_pixel, width), Rational.make(-1n, 2n)), view_width),
    );
    const y = Rational.add(
      this.#center[1],
      Rational.mul(Rational.add(Rational.make(y_pixel, height), Rational.make(-1n, 2n)), view_height),
    );
    return [
      this.#approx(x),
      this.#approx(y),
    ];
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
  
  constructor(canvas: HTMLCanvasElement, x_coordinate: HTMLInputElement, y_coordinate: HTMLInputElement, draw_level=0, margin=0.0) {
    this.#draw_level = draw_level;
    this.#margin = margin;
    this.#canvas = canvas;
    this.#x_coordinate = x_coordinate;
    this.#y_coordinate = y_coordinate;
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
        // console.log(`move ${dx}, ${dy}`);
        this.move(dx, dy);
      }
      this.updateCoord(e.clientX, e.clientY);
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
      // console.log(`zoom ${zoom.numerator}/${zoom.denominator}`);
      this.zoom(zoom);
      this.updateCoord(e.clientX, e.clientY);
    };
    this.#x_coordinate.onchange = e => {
      const x = RationalParser.parseRationalExpr(this.#x_coordinate.value);
      this.moveTo(x, this.#center[1]);
    };
    this.#y_coordinate.onchange = e => {
      const y = RationalParser.parseRationalExpr(this.#y_coordinate.value);
      this.moveTo(this.#center[0], y);
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

  moveTo(x: Rational.Rational, y: Rational.Rational) {
    this.#center = [x, y];
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

  updateCoord(x_pixel: number, y_pixel: number) {
    const pos = this.getPosition(BigInt(Math.floor(x_pixel)), BigInt(Math.floor(y_pixel)));
    this.#x_coordinate.value = RationalParser.formatRational(pos[0]);
    this.#y_coordinate.value = RationalParser.formatRational(pos[1]);
  }

  #stroke_style = "#06c";
  #fill_styles: Record<Penrose.HalfTile.Type, string> = {
    [Penrose.HalfTile.Type.P2XL]: "#9cf",
    [Penrose.HalfTile.Type.P2XR]: "#8be",
    [Penrose.HalfTile.Type.P2YL]: "#baf",
    [Penrose.HalfTile.Type.P2YR]: "#a9e",
    [Penrose.HalfTile.Type.P3XL]: "#9cf",
    [Penrose.HalfTile.Type.P3XR]: "#8be",
    [Penrose.HalfTile.Type.P3YL]: "#baf",
    [Penrose.HalfTile.Type.P3YR]: "#a9e",
  }
  
  #draw(bound: BBox.BBoxRational) {
    const tiles = this.#tree.getHalfTiles(this.#draw_level);
    this.#ctx.clearRect(0, 0, this.#canvas.clientWidth, this.#canvas.clientHeight);
    for (const tile of tiles) {
      const a = Approx.approxCyclotomicField5(tile.tri.tri.a, bound);
      const b = Approx.approxCyclotomicField5(tile.tri.tri.b, bound);
      const c = Approx.approxCyclotomicField5(tile.tri.tri.c, bound);

      // fill triangles
      this.#ctx.beginPath();
      this.#ctx.moveTo(...this.#toPixel(a.re, a.im));
      this.#ctx.lineTo(...this.#toPixel(b.re, b.im));
      this.#ctx.lineTo(...this.#toPixel(c.re, c.im));
      this.#ctx.closePath();
      this.#ctx.fillStyle = this.#fill_styles[tile.type]!;
      this.#ctx.fill();

      // draw tile borders
      this.#ctx.beginPath();
      if (Penrose.HalfTile.parity(tile.type) === Penrose.HalfTile.Parity.P3) {
        this.#ctx.moveTo(...this.#toPixel(c.re, c.im));
        this.#ctx.lineTo(...this.#toPixel(a.re, a.im));
        this.#ctx.lineTo(...this.#toPixel(b.re, b.im));
      } else {
        this.#ctx.moveTo(...this.#toPixel(b.re, b.im));
        this.#ctx.lineTo(...this.#toPixel(c.re, c.im));
        this.#ctx.lineTo(...this.#toPixel(a.re, a.im));
      }
      this.#ctx.strokeStyle = this.#stroke_style;
      this.#ctx.stroke();
    }

    if (this.#margin !== 0.0) {
      // draw previous level
      const tiles_parent = this.#tree.getHalfTiles(this.#draw_level + 1);
      for (const tile of tiles_parent) {
        const a = Approx.approxCyclotomicField5(tile.tri.tri.a, bound);
        const b = Approx.approxCyclotomicField5(tile.tri.tri.b, bound);
        const c = Approx.approxCyclotomicField5(tile.tri.tri.c, bound);

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

