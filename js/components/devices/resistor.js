// Linear resistor. Stamps its conductance directly into the MNA matrix.
export default {
  type: 'resistor',
  numExtraVars: 0,
  stamp({ G, n, params }) {
    const g = 1 / params.resistance;
    const [a, b] = n;
    if (a >= 0) G[a][a] += g;
    if (b >= 0) G[b][b] += g;
    if (a >= 0 && b >= 0) {
      G[a][b] -= g;
      G[b][a] -= g;
    }
  },
  currentAt({ x, n, params }) {
    const [a, b] = n;
    const va = a >= 0 ? x[a] : 0;
    const vb = b >= 0 ? x[b] : 0;
    return (va - vb) / params.resistance;
  },
  // A resistor's conductance doesn't depend on frequency, so its AC stamp is
  // the same value as its DC stamp — just written into the real part of the
  // complex admittance matrix.
  stampAc({ G, n, params }) {
    const g = 1 / params.resistance;
    const [a, b] = n;
    if (a >= 0) G[a][a].re += g;
    if (b >= 0) G[b][b].re += g;
    if (a >= 0 && b >= 0) {
      G[a][b].re -= g;
      G[b][a].re -= g;
    }
  },
};
