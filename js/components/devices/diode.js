// Shockley diode equation, linearized around the current Newton-Raphson
// guess each iteration: I(V) ≈ gd*V + ieq, where gd = dI/dV at the (clamped)
// guess and ieq = I(v) - gd*v. Current flows from the anode (terminal 0) to
// the cathode (terminal 1) when forward biased.
import { THERMAL_VOLTAGE, clampJunctionVoltage, diodeCurrentAndConductance } from './_nonlinearCommon.js';

function junctionVoltage(x, n) {
  const [a, c] = n;
  const va = a >= 0 ? x[a] : 0;
  const vc = c >= 0 ? x[c] : 0;
  return clampJunctionVoltage(va - vc);
}

export default {
  type: 'diode',
  numExtraVars: 0,
  stamp({ G, b, n, params, x }) {
    const [a, c] = n;
    const Is = params.saturationCurrent ?? 1e-14;
    const vt = (params.n ?? 1) * THERMAL_VOLTAGE;
    const v = junctionVoltage(x, n);

    const { i, g } = diodeCurrentAndConductance(v, Is, vt);
    const ieq = i - g * v;

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
    const Is = params.saturationCurrent ?? 1e-14;
    const vt = (params.n ?? 1) * THERMAL_VOLTAGE;
    const v = junctionVoltage(x, n);
    return diodeCurrentAndConductance(v, Is, vt).i;
  },
};
