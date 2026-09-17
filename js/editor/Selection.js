// Hit-testing for selecting/moving components and selecting wires. Component
// dragging itself is driven from main.js (it just needs to know what got hit).
import { componentBBoxGrid, distancePointToSegment, wireRoutePoints, wireEndpointsPx } from './Geometry.js';

export function findComponentAt(schematic, catalog, gx, gy) {
  for (let i = schematic.components.length - 1; i >= 0; i--) {
    const comp = schematic.components[i];
    const def = catalog[comp.type];
    const bbox = componentBBoxGrid(comp, def);
    if (gx >= bbox.minX && gx <= bbox.maxX && gy >= bbox.minY && gy <= bbox.maxY) {
      return comp.id;
    }
  }
  return null;
}

export function findWireNear(schematic, catalog, px, py, originPx, thresholdPx = 6) {
  const p = { x: px, y: py };
  for (const wire of schematic.wires) {
    const ends = wireEndpointsPx(wire, schematic, catalog, originPx);
    if (!ends) continue;
    const route = wireRoutePoints(ends.from, ends.to);
    for (let i = 0; i < route.length - 1; i++) {
      if (distancePointToSegment(p, route[i], route[i + 1]) <= thresholdPx) {
        return wire.id;
      }
    }
  }
  return null;
}
