// AC (frequency-domain) sweep: linearizes the whole circuit around its DC
// operating point, then solves the resulting complex MNA system G(jw)*x=b(jw)
// at each frequency in a log- or linear-spaced sweep. This is what drives a
// Bode plot — see js/sim/RunAC.js for the schematic-facing bridge and
// js/sim/Bode.js for the renderer.
import { complex } from './Complex.js';
import { solveComplex } from './ComplexLinAlg.js';
import { solveLinearDC } from './Solver.js';

export function solveAC(built, omega, xDC) {
  const { size, components } = built;
  const G = Array.from({ length: size }, () => Array.from({ length: size }, () => complex(0, 0)));
  const b = Array.from({ length: size }, () => complex(0, 0));

  for (const c of components) {
    c.def.stampAc({ G, b, n: c.nodeIdx, extra: c.extraIdx, params: c.params, omega, xDC });
  }

  return solveComplex(G, b);
}

function buildFrequencyList(fStart, fStop, points, sweep) {
  if (points === 1) return [fStart];
  if (sweep === 'linear') {
    return Array.from({ length: points }, (_, i) => fStart + ((fStop - fStart) * i) / (points - 1));
  }
  const logStart = Math.log10(fStart);
  const logStop = Math.log10(fStop);
  return Array.from({ length: points }, (_, i) => 10 ** (logStart + ((logStop - logStart) * i) / (points - 1)));
}

// Runs the full sweep: one DC operating point (for the nonlinear devices'
// linearization point and to seed history-free reactive devices), then one
// complex solve per frequency point.
export function runACSweep(circuit, { fStart, fStop, points, sweep = 'log' }) {
  if (!(fStart > 0)) throw new Error('AC sweep start frequency must be greater than 0 Hz.');
  if (!(fStop > fStart)) throw new Error('AC sweep stop frequency must be greater than the start frequency.');
  if (!(points >= 1)) throw new Error('AC sweep needs at least 1 point.');

  const built = circuit.build();
  const dc = solveLinearDC(built);
  const freqs = buildFrequencyList(fStart, fStop, points, sweep);
  const snapshots = freqs.map((f) => solveAC(built, 2 * Math.PI * f, dc.x));

  return { built, dc, freqs, snapshots };
}
