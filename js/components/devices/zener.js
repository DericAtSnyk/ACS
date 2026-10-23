// Zener diode: a forward Shockley junction (anode -> cathode) plus a reverse
// breakdown branch that starts conducting once the reverse voltage exceeds
// the zener voltage. Terminals: [anode, cathode]. The breakdown branch is an
// exponential with a 1 mA scale current, so `zenerVoltage` is where the
// reverse current reaches roughly 1 mA. Each branch is linearized around its
// own clamped Newton-Raphson guess, like the plain diode.
import { THERMAL_VOLTAGE, clampJunctionVoltage, diodeCurrentAndConductance } from './_nonlinearCommon.js';

const BREAKDOWN_SCALE_CURRENT = 1e-3;
const BREAKDOWN_VT = 2 * THERMAL_VOLTAGE;

function branches(x, n, params) {
  const [a, c] = n;
  const Is = params.saturationCurrent ?? 1e-14;
  const vt = (params.n ?? 1) * THERMAL_VOLTAGE;
  const vz = params.zenerVoltage ?? 5.1;
  const v = (a >= 0 ? x[a] : 0) - (c >= 0 ? x[c] : 0);

  const vf = clampJunctionVoltage(v);
  const fwd = diodeCurrentAndConductance(vf, Is, vt);

  // Breakdown conduction is a function of vbr = -v - vz; clamp vbr, then
  // express the clamped point back as an equivalent v0 for the linearization.
  const vbr = Math.max(-5, Math.min(0.85, -v - vz));
  // No "-1" term here (unlike a junction): the breakdown branch carries no
  // leakage below Vz, so its current is purely exponential.
  const e = Math.exp(vbr / BREAKDOWN_VT);
  const brk = { i: BREAKDOWN_SCALE_CURRENT * e, g: (BREAKDOWN_SCALE_CURRENT / BREAKDOWN_VT) * e };
  const v0 = -vbr - vz;

  return {
    vf,
    fwd,
    v0,
    brk,
    g: fwd.g + brk.g,
    // Total anode->cathode current at the linearization points.
    i: fwd.i - brk.i,
    ieq: fwd.i - fwd.g * vf + (-brk.i - brk.g * v0),
  };
}

export default {
  type: 'zener',
  numExtraVars: 0,
  stamp({ G, b, n, params, x }) {
    const [a, c] = n;
    const { g, ieq } = branches(x, n, params);
    if (a >= 0) G[a][a] += g;
    if (c >= 0) G[c][c] += g;
    if (a >= 0 && c >= 0) {
      G[a][c] -= g;
      G[c][a] -= g;
    }
    if (a >= 0) b[a] -= ieq;
    if (c >= 0) b[c] += ieq;
  },
  currentAt({ x, n, params }) {
    const [a, c] = n;
    const v = (a >= 0 ? x[a] : 0) - (c >= 0 ? x[c] : 0);
    const { g, ieq } = branches(x, n, params);
    return g * v + ieq;
  },
  stampAc({ G, n, params, xDC }) {
    const [a, c] = n;
    const { g } = branches(xDC, n, params);
    if (a >= 0) G[a][a].re += g;
    if (c >= 0) G[c][c].re += g;
    if (a >= 0 && c >= 0) {
      G[a][c].re -= g;
      G[c][a].re -= g;
    }
  },
};
