// Simplified large-signal Ebers-Moll NPN transistor. Terminals: [base,
// collector, emitter]. Deliberately NPN-only and ignores second-order
// effects (Early effect, base-width modulation, etc.) — enough to show real
// switching/saturation behavior without a full SPICE-grade model.
//
// I_F = Is*(exp(Vbe/Vt)-1), I_R = Is*(exp(Vbc/Vt)-1)   (the two junction diodes)
// I_C = I_F - (1 + 1/betaR)*I_R      (flows collector -> emitter)
// I_B = I_F/betaF + I_R/betaR        (flows base -> emitter)
// I_E follows automatically from KCL once I_C and I_B are stamped — it's
// never computed directly.
//
// Both I_C and I_B are linearized around the current NR guess and stamped as
// voltage-controlled current sources (one term per controlling voltage, Vbe
// and Vbc, summed by superposition via two stampVCCS calls each).
import {
  THERMAL_VOLTAGE,
  clampJunctionVoltage,
  diodeCurrentAndConductance,
  stampVCCS,
  stampVCCSAc,
} from './_nonlinearCommon.js';

export default {
  type: 'bjt_npn',
  numExtraVars: 0,
  stamp({ G, b, n, params, x }) {
    const [nb, nc, ne] = n;
    const vb = nb >= 0 ? x[nb] : 0;
    const vc = nc >= 0 ? x[nc] : 0;
    const ve = ne >= 0 ? x[ne] : 0;

    const Is = params.saturationCurrent ?? 1e-15;
    const betaF = params.betaF ?? 100;
    const betaR = params.betaR ?? 1;
    const vt = THERMAL_VOLTAGE;

    const vbe = clampJunctionVoltage(vb - ve);
    const vbc = clampJunctionVoltage(vb - vc);

    const { i: iF, g: gF } = diodeCurrentAndConductance(vbe, Is, vt);
    const { i: iR, g: gR } = diodeCurrentAndConductance(vbc, Is, vt);

    const ieqF = iF - gF * vbe;
    const ieqR = iR - gR * vbc;
    const kR = 1 + 1 / betaR;

    // I_C = I_F - kR*I_R, flowing collector -> emitter.
    stampVCCS(G, b, [nc, ne], [nb, ne], gF, ieqF);
    stampVCCS(G, b, [nc, ne], [nb, nc], -kR * gR, -kR * ieqR);

    // I_B = I_F/betaF + I_R/betaR, flowing base -> emitter.
    stampVCCS(G, b, [nb, ne], [nb, ne], gF / betaF, ieqF / betaF);
    stampVCCS(G, b, [nb, ne], [nb, nc], gR / betaR, ieqR / betaR);
  },
  // Reports collector current — the single most useful number for a probe
  // on a 3-terminal device.
  currentAt({ x, n, params }) {
    const [nb, nc, ne] = n;
    const vb = nb >= 0 ? x[nb] : 0;
    const vc = nc >= 0 ? x[nc] : 0;
    const ve = ne >= 0 ? x[ne] : 0;

    const Is = params.saturationCurrent ?? 1e-15;
    const betaR = params.betaR ?? 1;
    const vbe = clampJunctionVoltage(vb - ve);
    const vbc = clampJunctionVoltage(vb - vc);

    const iF = diodeCurrentAndConductance(vbe, Is, THERMAL_VOLTAGE).i;
    const iR = diodeCurrentAndConductance(vbc, Is, THERMAL_VOLTAGE).i;
    return iF - (1 + 1 / betaR) * iR;
  },
  // Small-signal transconductances at the DC operating point (xDC) — same
  // gF/gR as the real stamp, but no ieq offset (see diode.js's stampAc).
  stampAc({ G, n, params, xDC }) {
    const [nb, nc, ne] = n;
    const vb = nb >= 0 ? xDC[nb] : 0;
    const vc = nc >= 0 ? xDC[nc] : 0;
    const ve = ne >= 0 ? xDC[ne] : 0;

    const Is = params.saturationCurrent ?? 1e-15;
    const betaF = params.betaF ?? 100;
    const betaR = params.betaR ?? 1;
    const vt = THERMAL_VOLTAGE;

    const vbe = clampJunctionVoltage(vb - ve);
    const vbc = clampJunctionVoltage(vb - vc);

    const { g: gF } = diodeCurrentAndConductance(vbe, Is, vt);
    const { g: gR } = diodeCurrentAndConductance(vbc, Is, vt);
    const kR = 1 + 1 / betaR;

    stampVCCSAc(G, [nc, ne], [nb, ne], gF);
    stampVCCSAc(G, [nc, ne], [nb, nc], -kR * gR);

    stampVCCSAc(G, [nb, ne], [nb, ne], gF / betaF);
    stampVCCSAc(G, [nb, ne], [nb, nc], gR / betaR);
  },
};
