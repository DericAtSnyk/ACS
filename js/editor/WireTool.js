// Click-to-connect wiring: click one terminal to start a wire, click another
// to finish it. Clicking the same terminal again cancels.
import { addWire } from './Schematic.js';
import { GRID_SIZE, terminalGridPos } from './Geometry.js';

export function findTerminalNear(schematic, catalog, px, py, originPx, radiusPx = 9) {
  for (const comp of schematic.components) {
    const def = catalog[comp.type];
    for (let i = 0; i < def.terminals.length; i++) {
      const g = terminalGridPos(comp, def, i);
      const tx = originPx.x + g.x * GRID_SIZE;
      const ty = originPx.y + g.y * GRID_SIZE;
      if (Math.hypot(px - tx, py - ty) <= radiusPx) {
        return { componentId: comp.id, terminalIndex: i };
      }
    }
  }
  return null;
}

export function startOrFinishWire(state, hitTerminal) {
  if (!state.pendingWire) {
    state.pendingWire = hitTerminal;
    return;
  }
  const isSameTerminal =
    state.pendingWire.componentId === hitTerminal.componentId &&
    state.pendingWire.terminalIndex === hitTerminal.terminalIndex;
  if (isSameTerminal) {
    state.pendingWire = null;
    return;
  }
  addWire(state.schematic, state.pendingWire, hitTerminal);
  state.pendingWire = null;
}

export function cancelPendingWire(state) {
  state.pendingWire = null;
}
