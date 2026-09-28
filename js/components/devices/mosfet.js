// Level-1 (Shichman-Hodges) NMOS model, ignoring channel-length modulation
// (an ideal square-law device with infinite output resistance in
// saturation). Terminals: [gate, drain, source]. The gate draws zero
// current — Vgs only appears as a controlling voltage, never stamped at the
// gate node itself.
//
// Cutoff (Vgs <= Vt):        Id = 0
// Triode (Vds < Vgs-Vt):     Id = k*((Vgs-Vt)*Vds - Vds^2/2)
// Saturation (Vds >= Vgs-Vt): Id = (k/2)*(Vgs-Vt)^2
import { stampVCCS, stampVCCSAc } from './_nonlinearCommon.js';

function drainCurrentAndSlopes(vgs, vds, vt, k) {
  const vov = vgs - vt;
  if (vov <= 0) return { id: 0, gm: 0, gds: 0 };
  if (vds < vov) {
    return { id: k * (vov * vds - (vds * vds) / 2), gm: k * vds, gds: k * (vov - vds) };
  }
  return { id: (k / 2) * vov * vov, gm: k * vov, gds: 0 };
}

export default {
  type: 'nmos',
  numExtraVars: 0,
  stamp({ G, b, n, params, x }) {
    const [ng, nd, ns] = n;
    const vg = ng >= 0 ? x[ng] : 0;
    const vd = nd >= 0 ? x[nd] : 0;
    const vs = ns >= 0 ? x[ns] : 0;

    const vt = params.thresholdVoltage ?? 2;
    const k = params.transconductance ?? 1e-3;

    const vgs = vg - vs;
    const vds = vd - vs;
    const { id, gm, gds } = drainCurrentAndSlopes(vgs, vds, vt, k);
    const ieq = id - gm * vgs - gds * vds;

    // Id = gm*Vgs + gds*Vds + ieq, flowing drain -> source.
    stampVCCS(G, b, [nd, ns], [ng, ns], gm, 0);
    stampVCCS(G, b, [nd, ns], [nd, ns], gds, ieq);
  },
  currentAt({ x, n, params }) {
    const [ng, nd, ns] = n;
    const vg = ng >= 0 ? x[ng] : 0;
    const vd = nd >= 0 ? x[nd] : 0;
    const vs = ns >= 0 ? x[ns] : 0;
    const vt = params.thresholdVoltage ?? 2;
    const k = params.transconductance ?? 1e-3;
    return drainCurrentAndSlopes(vg - vs, vd - vs, vt, k).id;
  },
  // Small-signal gm/gds at the DC operating point (xDC) — same math as the
  // real stamp's linearization, but no ieq offset (see diode.js's stampAc).
  stampAc({ G, n, params, xDC }) {
    const [ng, nd, ns] = n;
    const vg = ng >= 0 ? xDC[ng] : 0;
    const vd = nd >= 0 ? xDC[nd] : 0;
    const vs = ns >= 0 ? xDC[ns] : 0;

    const vt = params.thresholdVoltage ?? 2;
    const k = params.transconductance ?? 1e-3;

    const { gm, gds } = drainCurrentAndSlopes(vg - vs, vd - vs, vt, k);

    stampVCCSAc(G, [nd, ns], [ng, ns], gm);
    stampVCCSAc(G, [nd, ns], [nd, ns], gds);
  },
};
