import * as Penrose from "./Penrose.js";
import * as Rational from "./Rational.js";
import * as BBox from "./BBox.js";
import * as Approx from "./Approx.js";

type Triangle = {a: Approx.Complex, b: Approx.Complex, c: Approx.Complex};

export class State {
  #draw_level: number = 0;
  #inner_frame: [number, number];
  #center_numerator: [bigint, bigint] = [0n, 0n];
  #center_denominator: bigint = 200000n;
  #pixel_numerator = 2000n;
  #drag_state = {
    dragging: false,
    lastX: 0,
    lastY: 0,
  };
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #bound: BBox.BBox;
  #tree: Penrose.PenroseTree;

  #zoom0 = Rational.make(999n, 1000n);
  
  constructor(canvas: HTMLCanvasElement, inner_frame: [number, number] = [0.2, 0.8]) {
    this.#inner_frame = inner_frame;
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d")!;

    const length_per_pixel = Rational.make(this.#pixel_numerator, this.#center_denominator);
    const rx = Rational.mul(Rational.fromInt(this.#canvas.clientWidth), Rational.mul(length_per_pixel, Rational.make(1n, 2n)));
    const ry = Rational.mul(Rational.fromInt(this.#canvas.clientHeight), Rational.mul(length_per_pixel, Rational.make(1n, 2n)));
    const cx = Rational.make(this.#center_numerator[0], this.#center_denominator);
    const cy = Rational.make(this.#center_numerator[1], this.#center_denominator);
    this.#bound = Approx.approxBBox(
      Rational.add(cx, Rational.neg(rx)),
      Rational.add(cy, Rational.neg(ry)),
      Rational.add(cx, rx),
      Rational.add(cy, ry),
    );
    this.#tree = new Penrose.PenroseTree(this.#bound);
    this.#tree.update(this.#bound);
    this.#draw();

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
        this.move(BigInt(e.offsetX - lastX), BigInt(e.offsetY - lastY));
      }
    };
    this.#canvas.onwheel = e => {
      e.preventDefault();
      const n = BigInt(Math.floor(Math.abs(e.deltaY)));
      let zoom = Rational.make(this.#zoom0.numerator ** n, this.#zoom0.denominator ** n);
      if (e.deltaY > 0) zoom = Rational.inv(zoom);
      this.zoom(zoom);
    };
  }
  
  move(dx_pixel: bigint, dy_pixel: bigint) {
    const dx = dx_pixel * this.#pixel_numerator;
    const dy = dy_pixel * this.#pixel_numerator;
    this.#center_numerator[0] += dx;
    this.#center_numerator[1] += dy;
    this.update();
  }

  zoom(zoom: Rational.Rational) {
    let denominator = this.#center_denominator * zoom.denominator / zoom.numerator;
    if (denominator === 0n) denominator = 1n;
    this.#center_numerator[0] =
      (denominator * this.#center_numerator[0]) / this.#center_denominator;
    this.#center_numerator[1] =
      (denominator * this.#center_numerator[1]) / this.#center_denominator;
    this.#pixel_numerator =
      (denominator * this.#pixel_numerator * zoom.denominator) / (this.#center_denominator * zoom.numerator);
    this.#center_denominator = denominator;
    this.update();
  }
  
  // scale(): string {
  // }
  // center_x(): string {
  // }
  // center_y(): string {
  // }
  // set(scale: string | undefined, x: string | undefined, y: string | undefined) {
  //   this.#length_per_pixel = scale === undefined ? this.#length_per_pixel : Rational.parseRationalExpr(scale);
  //   this.#center[0] = x === undefined ? this.#center[0] : Rational.parseRationalExpr(x);
  //   this.#center[1] = y === undefined ? this.#center[1] : Rational.parseRationalExpr(y);
  //   this.update();
  // }
  
  update() {
    const length_per_pixel = Rational.make(this.#pixel_numerator, this.#center_denominator);
    const rx = Rational.mul(Rational.fromInt(this.#canvas.clientWidth), Rational.mul(length_per_pixel, Rational.make(1n, 2n)));
    const ry = Rational.mul(Rational.fromInt(this.#canvas.clientHeight), Rational.mul(length_per_pixel, Rational.make(1n, 2n)));
    const cx = Rational.make(this.#center_numerator[0], this.#center_denominator);
    const cy = Rational.make(this.#center_numerator[1], this.#center_denominator);
    this.#bound = Approx.approxBBox(
      Rational.add(cx, Rational.neg(rx)),
      Rational.add(cy, Rational.neg(ry)),
      Rational.add(cx, rx),
      Rational.add(cy, ry),
    );
    this.#tree.update(this.#bound);
    this.#draw();
  }
  
  #draw() {
    const triangles = this.#tree.getTriangles(this.#bound, this.#draw_level);
    this.#ctx.clearRect(0, 0, this.#canvas.clientWidth, this.#canvas.clientHeight);
    for (const tri of triangles) {
      this.#drawTile(tri);
    }

    if (this.#inner_frame[0] !== 0.0 || this.#inner_frame[1] !== 1.0) {
      const triangles_parent = this.#tree.getTriangles(this.#bound, this.#draw_level + 1);
      for (const tri of triangles_parent) {
        this.#drawTriangleDash(tri);
      }

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
      (x * (this.#inner_frame[1] - this.#inner_frame[0]) + this.#inner_frame[0]) * this.#canvas.clientWidth,
      (y * (this.#inner_frame[1] - this.#inner_frame[0]) + this.#inner_frame[0]) * this.#canvas.clientHeight,
    ]
  }

  #drawTile({a, b, c}: Triangle, fill="#9cf", stroke="#06c") {
    this.#ctx.beginPath();
    this.#ctx.moveTo(...this.#toPixel(a.re, a.im));
    this.#ctx.lineTo(...this.#toPixel(b.re, b.im));
    this.#ctx.lineTo(...this.#toPixel(c.re, c.im));
    this.#ctx.closePath();
    this.#ctx.fillStyle = fill;
    this.#ctx.fill();

    this.#ctx.beginPath();
    this.#ctx.moveTo(...this.#toPixel(c.re, c.im));
    this.#ctx.lineTo(...this.#toPixel(a.re, a.im));
    this.#ctx.lineTo(...this.#toPixel(b.re, b.im));
    this.#ctx.strokeStyle = stroke;
    this.#ctx.stroke();
  }

  #drawTriangleDash({a, b, c}: Triangle, stroke="red") {
    this.#ctx.beginPath();
    this.#ctx.setLineDash([5, 10]);
    this.#ctx.moveTo(...this.#toPixel(c.re, c.im));
    this.#ctx.lineTo(...this.#toPixel(a.re, a.im));
    this.#ctx.lineTo(...this.#toPixel(b.re, b.im));
    this.#ctx.closePath();
    this.#ctx.strokeStyle = stroke;
    this.#ctx.stroke();
    this.#ctx.setLineDash([]);
  }
}

