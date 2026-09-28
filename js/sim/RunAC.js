// Bridges the editor's schematic model to an AC sweep and exposes per-
// frequency phasor accessors for the UI (Bode.js reads through here rather
// than touching js/core/ directly) — mirrors RunTransient.js's shape.
import { runACSweep } from '../core/AC.js';
import { mag, phaseDeg as complexPhaseDeg } from '../core/Complex.js';
import { buildCircuitFromSchematic } from './RunDC.js';

function terminalKey(componentId, terminalIndex) {
  return `${componentId}#${terminalIndex}`;
}

export function runACFromSchematic(schematic, catalog, opts) {
  const circuit = buildCircuitFromSchematic(schematic, catalog);
  return runACSweep(circuit, opts);
}

// Complex node voltage at a given sweep frequency. Ground / unresolved
// terminals read as 0, same convention as nodeVoltage() in js/core/Solver.js.
export function terminalPhasorAt(runResult, freqIndex, componentId, terminalIndex) {
  const idx = runResult.built.nodeIndexOf(terminalKey(componentId, terminalIndex));
  if (idx === undefined || idx === -1) return { re: 0, im: 0 };
  return runResult.snapshots[freqIndex][idx];
}

export function magnitudeDb(z) {
  return 20 * Math.log10(mag(z));
}

export function phaseDeg(z) {
  return complexPhaseDeg(z);
}
