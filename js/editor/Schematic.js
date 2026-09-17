// The editor's own data model: placed components and the wires between their
// terminals. This is intentionally separate from js/core/Circuit.js (the
// solver's netlist) — js/sim/RunDC.js derives one from the other at run time.
function genId(type) {
  return `${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createSchematic() {
  return { components: [], wires: [] };
}

export function addComponent(schematic, type, gridX, gridY, rotation, params) {
  const id = genId(type);
  schematic.components.push({ id, type, x: gridX, y: gridY, rotation, params: { ...params } });
  return id;
}

export function removeComponent(schematic, componentId) {
  schematic.components = schematic.components.filter((c) => c.id !== componentId);
  schematic.wires = schematic.wires.filter(
    (w) => w.from.componentId !== componentId && w.to.componentId !== componentId
  );
}

function sameTerminal(a, b) {
  return a.componentId === b.componentId && a.terminalIndex === b.terminalIndex;
}

export function addWire(schematic, from, to) {
  if (sameTerminal(from, to)) return null;
  const exists = schematic.wires.some(
    (w) => (sameTerminal(w.from, from) && sameTerminal(w.to, to)) || (sameTerminal(w.from, to) && sameTerminal(w.to, from))
  );
  if (exists) return null;
  const id = genId('wire');
  schematic.wires.push({ id, from, to });
  return id;
}

export function removeWire(schematic, wireId) {
  schematic.wires = schematic.wires.filter((w) => w.id !== wireId);
}

export function findComponent(schematic, componentId) {
  return schematic.components.find((c) => c.id === componentId) || null;
}

export function moveComponent(schematic, componentId, gridX, gridY) {
  const c = findComponent(schematic, componentId);
  if (c) {
    c.x = gridX;
    c.y = gridY;
  }
}

export function rotateComponent(schematic, componentId) {
  const c = findComponent(schematic, componentId);
  if (c) c.rotation = (c.rotation + 90) % 360;
}
