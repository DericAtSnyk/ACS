// Pure geometry helpers shared by rendering and hit-testing. Nothing here
// touches the DOM or mutates editor state.
export const GRID_SIZE = 24; // px per grid unit

export function rotatePoint(x, y, rotationDeg) {
  switch (((rotationDeg % 360) + 360) % 360) {
    case 90:
      return { x: -y, y: x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: y, y: -x };
    default:
      return { x, y };
  }
}

export function terminalGridPos(component, catalogEntry, terminalIndex) {
  const t = catalogEntry.terminals[terminalIndex];
  const rotated = rotatePoint(t.x, t.y, component.rotation);
  return { x: component.x + rotated.x, y: component.y + rotated.y };
}

// Bounding box (in grid units) of a component's body, accounting for rotation.
export function componentBBoxGrid(component, catalogEntry) {
  const { minX, minY, maxX, maxY } = catalogEntry.bodyExtentGrid;
  const corners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ].map((p) => rotatePoint(p.x, p.y, component.rotation));
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  return {
    minX: component.x + Math.min(...xs),
    maxX: component.x + Math.max(...xs),
    minY: component.y + Math.min(...ys),
    maxY: component.y + Math.max(...ys),
  };
}

export function pixelToGrid(px, py, originPx) {
  return { x: (px - originPx.x) / GRID_SIZE, y: (py - originPx.y) / GRID_SIZE };
}

export function snapToGrid(x, y) {
  return { x: Math.round(x), y: Math.round(y) };
}

export function distancePointToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

// Single-bend orthogonal route between two pixel points (horizontal first).
export function wireRoutePoints(fromPx, toPx) {
  const mid = { x: toPx.x, y: fromPx.y };
  return [fromPx, mid, toPx];
}

// A wire connects two component terminals by reference, not by baked-in
// coordinates, so moving a component automatically drags its wires with it.
export function wireEndpointsPx(wire, schematic, catalog, originPx) {
  const fromComp = schematic.components.find((c) => c.id === wire.from.componentId);
  const toComp = schematic.components.find((c) => c.id === wire.to.componentId);
  if (!fromComp || !toComp) return null;
  const fromG = terminalGridPos(fromComp, catalog[fromComp.type], wire.from.terminalIndex);
  const toG = terminalGridPos(toComp, catalog[toComp.type], wire.to.terminalIndex);
  return {
    from: { x: originPx.x + fromG.x * GRID_SIZE, y: originPx.y + fromG.y * GRID_SIZE },
    to: { x: originPx.x + toG.x * GRID_SIZE, y: originPx.y + toG.y * GRID_SIZE },
  };
}
