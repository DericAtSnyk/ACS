// Complex-valued Gaussian elimination with partial pivoting, mirroring
// js/core/LinAlg.js's real solve() exactly — same structure, same
// singular-matrix error — but operating on {re, im} entries so the AC solver
// (js/core/AC.js) can solve G(jw)*x = b(jw) directly instead of splitting
// into separate real/imaginary linear systems.
import { add, sub, mul, div, mag, complex } from './Complex.js';

export function solveComplex(A, b) {
  const n = A.length;
  if (n === 0) return [];

  const M = A.map((row) => row.map((z) => complex(z.re, z.im)));
  const v = b.map((z) => complex(z.re, z.im));

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxAbs = mag(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const candidate = mag(M[r][col]);
      if (candidate > maxAbs) {
        maxAbs = candidate;
        pivotRow = r;
      }
    }

    if (maxAbs < 1e-15) {
      throw new Error(
        'Singular AC matrix: circuit is under-constrained (e.g. a floating node with no path to ground, or a missing ground reference).'
      );
    }

    if (pivotRow !== col) {
      [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
      [v[col], v[pivotRow]] = [v[pivotRow], v[col]];
    }

    for (let r = col + 1; r < n; r++) {
      const factor = div(M[r][col], M[col][col]);
      if (factor.re === 0 && factor.im === 0) continue;
      for (let c = col; c < n; c++) M[r][c] = sub(M[r][c], mul(factor, M[col][c]));
      v[r] = sub(v[r], mul(factor, v[col]));
    }
  }

  const x = new Array(n).fill(null).map(() => complex(0, 0));
  for (let r = n - 1; r >= 0; r--) {
    let sum = v[r];
    for (let c = r + 1; c < n; c++) sum = sub(sum, mul(M[r][c], x[c]));
    x[r] = div(sum, M[r][r]);
  }
  return x;
}
