// Bridges the editor's schematic model to a full transient run and exposes
// per-step accessors for the UI (Player/Scope/CurrentFlowOverlay all read
// through here rather than touching js/core/ directly).
import { runTransient } from '../core/Transient.js';
import { nodeVoltage, resolvedCurrent } from '../core/Solver.js';
import { buildCircuitFromSchematic } from './RunDC.js';

function terminalKey(componentId, terminalIndex) {
  return `${componentId}#${terminalIndex}`;
}

export function runTransientFromSchematic(schematic, catalog, { tStop, dt }) {
  const circuit = buildCircuitFromSchematic(schematic, catalog);
  return runTransient(circuit, { tStop, dt });
}

export function terminalVoltageAt(runResult, stepIndex, componentId, terminalIndex) {
  const snapshot = runResult.snapshots[stepIndex];
  return nodeVoltage(runResult.built, { x: snapshot.x }, terminalKey(componentId, terminalIndex));
}

export function componentCurrentAt(runResult, stepIndex, componentId) {
  const comp = runResult.built.components.find((c) => c.id === componentId);
  if (!comp) return undefined;
  const snapshot = runResult.snapshots[stepIndex];
  if (snapshot.currents[componentId] !== undefined) return snapshot.currents[componentId];
  return resolvedCurrent(comp, snapshot.x, runResult.times[stepIndex]);
}
