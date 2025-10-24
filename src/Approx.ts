/// approximate some algebraic operations on rational numbers in any precision
/// such as sqaure root, multiply sqrt(5), multiply/divide by Im(zeta)

function solve(f: (x: bigint) => bigint, x0: bigint, x1: bigint, floor: boolean): bigint {
  let y0 = f(x0);
  if (y0 === 0n) return x0;
  let y1 = f(x1);
  if (y1 === 0n) return x1;

  for (let count = 0;; count++) {
    // if (count % 10000 == 0) console.log(`solver ${count}`);
    const s0 = y0 > 0n;
    const s1 = y1 > 0n;
    if (s0 !== s1 && (x0 - x1 === 1n || x1 - x0 === 1n)) {
      return floor === (x0 < x1) ? x0 : x1;
    }

    let x2 = (x1 * y0 - x0 * y1) / (y0 - y1);
    if (x0 === x2) {
      x2 = (s0 !== s1) === (x0 < x1) ? x0 + 1n : x0 - 1n;
    } else if (x1 === x2) {
      x2 = (s0 !== s1) === (x1 < x0) ? x1 + 1n : x1 - 1n;
    }
    const y2 = f(x2);
    if (y2 === 0n) return x2;
    const s2 = y2 > 0n;

    if (s0 !== s1) {
      if (s0 === s2) {
        x0 = x2;
        y0 = y2;
      } else {
        x1 = x2;
        y1 = y2;
      }
    } else {
      if ((x2 < x0) === (x0 < x1)) {
        x1 = x2;
        y1 = y2;
      } else {
        x0 = x2;
        y0 = y2;
      }
    }
  }  
}

type Rational = [n:bigint, d:bigint];

// approximate sqrt(value)
export function sqrt(value: Rational, floor: boolean, eps: bigint): Rational | undefined {
  if (value[0] < 0n) return;

  // x^2 - r = 0
  // let n/d = x, a/b = r
  // solve f(n) = b n^2 - a d^2

  const sqrt_num = Number(value[0]) / Number(value[1]);

  let n = BigInt(Math.floor(sqrt_num * Number(eps)));
  let d = eps;
  
  const a = value[0];
  const b = value[1];
  const _ad2 = a * d ** 2n;
  n = solve(n => b * n ** 2n - _ad2, n, n + 1n, floor);
  
  return [n, d];
}



// sqrt(5) ceiling approximation
const sqrt5_approx: Rational = [
  BigInt(Math.ceil(Math.sqrt(5)) * 1e+9),
  BigInt(1e+9),
];

// approximate value * sqrt(5)
export function mul_sqrt5(value: Rational, floor: boolean, eps: bigint): Rational {
  if (value[0] < 0n) {
    const [n, d] = mul_sqrt5([-value[0], value[1]], !floor, eps);
    return [-n, d];
  }

  // sqrt(5) r - x = 0
  // 5 r^2 - x^2 = 0
  // let n/d = x, a/b = r^2
  // solve f(n) = b n^2 - 5 a d^2

  let n = value[0] * sqrt5_approx[0];
  let d = value[1] * sqrt5_approx[1];
  while (d < eps) {
    n *= 2n;
    d *= 2n;
  }
  
  const a = value[0] * value[0];
  const b = value[1] * value[1];
  const _5ad2 = 5n * a * d ** 2n;
  n = solve(n => b * n ** 2n - _5ad2, n, n - 1n, floor);
  
  return [n, d];
}


// Im(zeta)^2 ceiling approximation
const zeta_imag_sq_approx: Rational = [
  BigInt(Math.ceil((5 + Math.sqrt(5))/8 * 1e+9)),
  BigInt(1e+9),
];

function mul_zeta_imag_sq(value: Rational, floor: boolean, eps: bigint): Rational {
  if (value[0] < 0n) {
    const [n, d] = mul_zeta_imag_sq([-value[0], value[1]], !floor, eps);
    return [-n, d];
  }
  // Im(zeta)^2 r - x = 0
  // 5/8 r +- sqrt(5)/8 r - x = 0
  // (5 r - 8 x)^2 - 5 r^2 = 0
  // let n/d = x, a/b = r
  // solve f(n) = (5 a d - 8 b n)^2 - 5 a^2 d^2 = 0
  
  let n = value[0] * zeta_imag_sq_approx[0];
  let d = value[1] * zeta_imag_sq_approx[1];
  while (d < eps) {
    n *= 2n;
    d *= 2n;
  }

  const a = value[0];
  const b = value[1];
  const _5ad = 5n * a * d;
  const f = (n: bigint) => (8n * b * n - _5ad) ** 2n - _5ad ** 2n / 5n;
  n = solve(f, n, n - 1n, floor);
  
  return [n, d];
}

function div_zeta_imag_sq(value: Rational, floor: boolean, eps: bigint): Rational {
  if (value[0] < 0n) {
    const [n, d] = div_zeta_imag_sq([-value[0], value[1]], !floor, eps);
    return [-n, d];
  }
  // Im(zeta)^2 x - r = 0
  // 5/8 x +- sqrt(5)/8 x - r = 0
  // (5 x - 8 r)^2 - 5 x^2 = 0
  // let n/d = x, a/b = r
  // solve f(n) = (5 b n - 8 a d)^2 - 5 b^2 n^2 = 0
  
  let n = value[0] * zeta_imag_sq_approx[1];
  let d = value[1] * zeta_imag_sq_approx[0];
  while (d < eps) {
    n *= 2n;
    d *= 2n;
  }

  const a = value[0];
  const b = value[1];
  const _8ad = 8n * a * d;
  const f = (n: bigint) => {
    let _5bn = 5n * b * n;
    return (_5bn - _8ad) ** 2n - _5bn ** 2n / 5n;
  };
  n = solve(f, n, n - 1n, floor);
  
  return [n, d];
}

// approximate value * Im(zeta)
export function mul_zeta_imag(value: Rational, floor: boolean, eps: bigint): Rational {
  const value_sq: Rational = [value[0]*value[0], value[1]*value[1]];
  const sgn = (value[0] >= 0) === (value[1] >= 0) ? 1n : -1n;
  if (sgn === -1n) floor = !floor;
  const [n, d] = sqrt(mul_zeta_imag_sq(value_sq, floor, eps * eps), floor, eps)!;
  return [sgn * n, d];
}
// approximate value / Im(zeta)
export function div_zeta_imag(value: Rational, floor: boolean, eps: bigint): Rational {
  const value_sq: Rational = [value[0]*value[0], value[1]*value[1]];
  const sgn = (value[0] >= 0) === (value[1] >= 0) ? 1n : -1n;
  if (sgn === -1n) floor = !floor;
  const [n, d] = sqrt(div_zeta_imag_sq(value_sq, floor, eps * eps), floor, eps)!;
  return [sgn * n, d];
}
