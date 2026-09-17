// Tracks which points the user has clicked to watch on the oscilloscope:
// a voltage probe pins a terminal (i.e. a node), a current probe pins a
// whole component. Clicking an already-probed point removes it.
let nextProbeId = 0;

export function toggleVoltageProbe(state, componentId, terminalIndex, label) {
  const idx = state.probes.findIndex(
    (p) => p.kind === 'voltage' && p.componentId === componentId && p.terminalIndex === terminalIndex
  );
  if (idx >= 0) {
    state.probes.splice(idx, 1);
    return;
  }
  state.probes.push({ id: `probe_${nextProbeId++}`, kind: 'voltage', componentId, terminalIndex, label });
}

export function toggleCurrentProbe(state, componentId, label) {
  const idx = state.probes.findIndex((p) => p.kind === 'current' && p.componentId === componentId);
  if (idx >= 0) {
    state.probes.splice(idx, 1);
    return;
  }
  state.probes.push({ id: `probe_${nextProbeId++}`, kind: 'current', componentId, label });
}
