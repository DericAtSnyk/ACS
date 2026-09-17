// Linear inductor, stamped as a trapezoidal-integration companion model: a
// conductance Geq = dt/(2L) in parallel with a current source carrying the
// device's history. Under a plain DC operating point it's approximated as a
// near-short (large conductance) rather than solved with a proper extra
// branch-current unknown — a deliberate simplification for this simulator.
//
// Derivation: integrating v = L*di/dt over one step with the trapezoidal
// rule gives i(t) = Geq*v(t) + Ieq, where Ieq = i_prev + Geq*v_prev.
const DC_NEAR_SHORT_CONDUCTANCE = 1e9;

export default {
  type: 'inductor',
  numExtraVars: 0,
  stamp({ G, b, n, params, memory, dt }) {
    const [a, bIdx] = n;

    if (!dt) {
      const geq = DC_NEAR_SHORT_CONDUCTANCE;
      if (a >= 0) G[a][a] += geq;
      if (bIdx >= 0) G[bIdx][bIdx] += geq;
      if (a >= 0 && bIdx >= 0) {
        G[a][bIdx] -= geq;
        G[bIdx][a] -= geq;
      }
      memory._geq = geq;
      memory._k = 0;
      return;
    }

    const vPrev = memory.vPrev ?? 0;
    const iPrev = memory.iPrev ?? 0;
    const geq = dt / (2 * params.inductance);
    const ieqHistory = iPrev + geq * vPrev;

    if (a >= 0) G[a][a] += geq;
    if (bIdx >= 0) G[bIdx][bIdx] += geq;
    if (a >= 0 && bIdx >= 0) {
      G[a][bIdx] -= geq;
      G[bIdx][a] -= geq;
    }
    if (a >= 0) b[a] -= ieqHistory;
    if (bIdx >= 0) b[bIdx] += ieqHistory;

    memory._geq = geq;
    memory._k = ieqHistory;
  },
  updateMemory(x, n, memory) {
    const [a, bIdx] = n;
    const va = a >= 0 ? x[a] : 0;
    const vb = bIdx >= 0 ? x[bIdx] : 0;
    const v = va - vb;
    const i = (memory._geq ?? 0) * v + (memory._k ?? 0);
    memory.vPrev = v;
    memory.iPrev = i;
    return i;
  },
};
