// Ideal transformer: V(secondary) = ratio * V(primary), with primary and
// secondary current related so that no power is stored or lost (ratio is
// Ns/Np). Terminals: [p1, p2, s1, s2]. One extra MNA unknown: the primary
// current flowing p1 -> p2 through the winding. Being ideal it passes DC too
// and has no magnetizing inductance or leakage.
export default {
  type: 'transformer',
  numExtraVars: 1,
  stamp({ G, n, extra, params }) {
    const [p1, p2, s1, s2] = n;
    const [k] = extra;
    const r = params.ratio;
    if (p1 >= 0) {
      G[p1][k] += 1;
      G[k][p1] += 1;
    }
    if (p2 >= 0) {
      G[p2][k] -= 1;
      G[k][p2] -= 1;
    }
    if (s1 >= 0) {
      G[s1][k] -= 1 / r;
      G[k][s1] -= 1 / r;
    }
    if (s2 >= 0) {
      G[s2][k] += 1 / r;
      G[k][s2] += 1 / r;
    }
  },
  stampAc({ G, n, extra, params }) {
    const [p1, p2, s1, s2] = n;
    const [k] = extra;
    const r = params.ratio;
    if (p1 >= 0) {
      G[p1][k].re += 1;
      G[k][p1].re += 1;
    }
    if (p2 >= 0) {
      G[p2][k].re -= 1;
      G[k][p2].re -= 1;
    }
    if (s1 >= 0) {
      G[s1][k].re -= 1 / r;
      G[k][s1].re -= 1 / r;
    }
    if (s2 >= 0) {
      G[s2][k].re += 1 / r;
      G[k][s2].re += 1 / r;
    }
  },
};
