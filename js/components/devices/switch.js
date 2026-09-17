// Time-controlled ideal switch: open (near-infinite resistance) before its
// closeTime, closed (near-zero resistance) from closeTime onward. It's a
// deliberately simple building block for "what happens when this connects at
// time T" demonstrations, not a voltage- or logic-controlled switch.
const ON_RESISTANCE = 0.01;
const OFF_RESISTANCE = 1e9;

function isClosed(params, t) {
  return (t ?? 0) >= (params.closeTime ?? 0);
}

export default {
  type: 'switch',
  numExtraVars: 0,
  stamp({ G, n, params, t }) {
    const [a, b] = n;
    const g = 1 / (isClosed(params, t) ? ON_RESISTANCE : OFF_RESISTANCE);
    if (a >= 0) G[a][a] += g;
    if (b >= 0) G[b][b] += g;
    if (a >= 0 && b >= 0) {
      G[a][b] -= g;
      G[b][a] -= g;
    }
  },
  currentAt({ x, n, params, t }) {
    const [a, b] = n;
    const va = a >= 0 ? x[a] : 0;
    const vb = b >= 0 ? x[b] : 0;
    const g = 1 / (isClosed(params, t) ? ON_RESISTANCE : OFF_RESISTANCE);
    return (va - vb) * g;
  },
};
