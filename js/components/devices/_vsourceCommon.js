// Shared MNA stamp for any two-terminal ideal voltage source: it needs an
// extra branch-current unknown because an ideal source has no conductance to
// stamp directly. Only how the voltage VALUE is computed differs between a
// DC source and a time-varying one (see vsource.js / vsourceSine.js).
export function stampVSource(ctx, getVoltage) {
  const { G, b, n, extra } = ctx;
  const [p, m] = n;
  const [k] = extra;
  if (p >= 0) {
    G[p][k] += 1;
    G[k][p] += 1;
  }
  if (m >= 0) {
    G[m][k] -= 1;
    G[k][m] -= 1;
  }
  b[k] += getVoltage(ctx);
}
