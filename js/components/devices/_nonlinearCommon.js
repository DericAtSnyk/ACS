// Shared building blocks for nonlinear devices (diode, BJT, MOSFET), all of
// which re-linearize around the Newton-Raphson iteration's current voltage
// guess (js/core/Solver.js passes that guess in as ctx.x).
export const THERMAL_VOLTAGE = 0.025852; // kT/q at ~300K

// Clamp a junction voltage before evaluating exp() so a wild NR guess can't
// overflow to Infinity/NaN and derail convergence. Forward bias is capped
// well below where currents would already be absurd for typical Is; reverse
// bias is capped since leakage current saturates at -Is well before this.
export function clampJunctionVoltage(v) {
  return Math.max(-5, Math.min(0.85, v));
}

// A forward-biased pn-junction diode's current and its derivative (used to
// build the Shockley diode itself, and as a building block inside BJT
// Ebers-Moll junctions).
export function diodeCurrentAndConductance(v, Is, vt) {
  const i = Is * (Math.exp(v / vt) - 1);
  const g = (Is / vt) * Math.exp(v / vt);
  return { i, g };
}

// Stamps a voltage-controlled current source: current `g*(Vc-Vd) + ieq`
// flows from node x to node y. Called multiple times (with different
// controlling pairs) to accumulate a device's full Jacobian by
// superposition — e.g. a BJT's collector current depends on both Vbe and
// Vbc, so it's stamped as two separate VCCS contributions to the same
// [collector, emitter] pair.
export function stampVCCS(G, b, [x, y], [c, d], g, ieq) {
  if (x >= 0 && c >= 0) G[x][c] += g;
  if (x >= 0 && d >= 0) G[x][d] -= g;
  if (y >= 0 && c >= 0) G[y][c] -= g;
  if (y >= 0 && d >= 0) G[y][d] += g;
  if (x >= 0) b[x] -= ieq;
  if (y >= 0) b[y] += ieq;
}
