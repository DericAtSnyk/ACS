// Linear capacitor, stamped as a trapezoidal-integration companion model: a
// conductance Geq = 2C/dt in parallel with a current source that carries the
// device's history (previous voltage/current). No extra MNA unknown needed —
// unlike an inductor's, a capacitor's current here is a direct function of
// the (already-unknown) node voltages once Geq is known.
//
// Derivation: integrating i = C*dv/dt over one step with the trapezoidal
// rule gives i(t) = Geq*v(t) - Ieq, where Ieq = Geq*v_prev + i_prev.
export default {
  type: 'capacitor',
  numExtraVars: 0,
  stamp({ G, b, n, params, memory, dt }) {
    const [a, bIdx] = n;

    if (!dt) {
      // Pure DC operating point: a capacitor is an open circuit in steady state.
      return;
    }

    const vPrev = memory.vPrev ?? 0;
    const iPrev = memory.iPrev ?? 0;
    const geq = (2 * params.capacitance) / dt;
    const ieq = geq * vPrev + iPrev;

    if (a >= 0) G[a][a] += geq;
    if (bIdx >= 0) G[bIdx][bIdx] += geq;
    if (a >= 0 && bIdx >= 0) {
      G[a][bIdx] -= geq;
      G[bIdx][a] -= geq;
    }
    if (a >= 0) b[a] += ieq;
    if (bIdx >= 0) b[bIdx] -= ieq;

    memory._geq = geq;
    memory._ieq = ieq;
  },
  // Called once per step, after the system has been solved, to compute this
  // step's actual capacitor current and remember (v, i) for next step's
  // companion model. Returns the current so the transient loop can record it
  // (it's otherwise lost the moment memory is overwritten).
  updateMemory(x, n, memory) {
    const [a, bIdx] = n;
    const va = a >= 0 ? x[a] : 0;
    const vb = bIdx >= 0 ? x[bIdx] : 0;
    const v = va - vb;
    const i = (memory._geq ?? 0) * v - (memory._ieq ?? 0);
    memory.vPrev = v;
    memory.iPrev = i;
    return i;
  },
  // Small-signal AC admittance Y = jwC — no history/companion model, since
  // AC analysis has no time steps.
  stampAc({ G, n, params, omega }) {
    const [a, bIdx] = n;
    const y = omega * params.capacitance;
    if (a >= 0) G[a][a].im += y;
    if (bIdx >= 0) G[bIdx][bIdx].im += y;
    if (a >= 0 && bIdx >= 0) {
      G[a][bIdx].im -= y;
      G[bIdx][a].im -= y;
    }
  },
};
