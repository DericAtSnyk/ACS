// Precomputes a full transient run: builds the circuit once (so device
// `memory` persists across steps), then solves at each timestep from t=0 to
// t=tStop, collecting every step's solution so the UI can play/pause/scrub
// through it afterwards without re-solving.
import { solveMNA } from './Solver.js';

export function runTransient(circuit, { tStop, dt }) {
  const built = circuit.build();
  const steps = Math.max(1, Math.round(tStop / dt));

  const times = [];
  const snapshots = [];
  let previousX;

  for (let step = 0; step <= steps; step++) {
    const t = step * dt;
    // Seed each step's Newton-Raphson search from the previous step's
    // solution — for a slowly-changing circuit that's already close to the
    // answer, which helps nonlinear devices (diode, BJT, MOSFET) converge
    // in fewer iterations than starting from all-zero every time.
    const result = solveMNA(built, { t, dt, x0: previousX });
    previousX = result.x;
    const currents = collectHistoryCurrents(built, result.x);
    times.push(t);
    snapshots.push({ x: result.x, currents });
  }

  return { built, times, snapshots };
}

// Capacitors/inductors don't have an MNA branch-current unknown — their
// current only exists as a byproduct of their companion model's history, so
// it has to be captured at solve time or it's lost once memory is overwritten
// for the next step.
function collectHistoryCurrents(built, x) {
  const currents = {};
  for (const c of built.components) {
    if (c.def.updateMemory) {
      currents[c.id] = c.def.updateMemory(x, c.nodeIdx, c.memory);
    }
  }
  return currents;
}
