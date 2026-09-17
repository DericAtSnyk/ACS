// Dense linear solve via Gaussian elimination with partial pivoting.
// Used to solve the MNA system G*x = b at each DC operating point / transient step.
export function solve(A, b) {
  const n = A.length;
  if (n === 0) return [];

  const M = A.map((row) => row.slice());
  const v = b.slice();

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const candidate = Math.abs(M[r][col]);
      if (candidate > maxAbs) {
        maxAbs = candidate;
        pivotRow = r;
      }
    }

    if (maxAbs < 1e-15) {
      throw new Error(
        'Singular MNA matrix: circuit is under-constrained (e.g. a floating node with no path to ground, or a missing ground reference).'
      );
    }

    if (pivotRow !== col) {
      [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
      [v[col], v[pivotRow]] = [v[pivotRow], v[col]];
    }

    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / M[col][col];
      if (factor === 0) continue;
      for (let c = col; c < n; c++) M[r][c] -= factor * M[col][c];
      v[r] -= factor * v[col];
    }
  }

  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = v[r];
    for (let c = r + 1; c < n; c++) sum -= M[r][c] * x[c];
    x[r] = sum / M[r][r];
  }
  return x;
}
