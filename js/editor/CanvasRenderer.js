// Draws the whole schematic: grid, wires (with current-flow indication),
// components, selection/hover/probe highlights, and voltage/current labels
// for whichever result is active (a one-shot DC solve or a scrubbed point in
// a precomputed transient run).
import { GRID_SIZE, terminalGridPos, componentBBoxGrid, wireRoutePoints, wireEndpointsPx } from './Geometry.js';
import { resolvedCurrent } from '../core/Solver.js';
import { terminalVoltage as dcTerminalVoltage } from '../sim/RunDC.js';
import { terminalVoltageAt, componentCurrentAt } from '../sim/RunTransient.js';
import { drawCurrentFlow } from '../sim/CurrentFlowOverlay.js';
import { probeColor } from '../sim/Scope.js';

function formatSI(value) {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}k`;
  if (abs !== 0 && abs < 1e-3) return `${(value * 1e6).toFixed(2)}µ`;
  return `${value}`;
}

function drawGrid(ctx, canvas, originPx) {
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2a2d36';
  const cols = Math.ceil(canvas.width / GRID_SIZE) + 1;
  const rows = Math.ceil(canvas.height / GRID_SIZE) + 1;
  const offX = ((originPx.x % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
  const offY = ((originPx.y % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j <= rows; j++) {
      ctx.beginPath();
      ctx.arc(offX + i * GRID_SIZE, offY + j * GRID_SIZE, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWire(ctx, points, selected) {
  ctx.strokeStyle = selected ? '#ffcf5c' : '#7fd88f';
  ctx.lineWidth = selected ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
}

function drawComponentBody(ctx, comp, def, originPx) {
  ctx.save();
  ctx.translate(originPx.x + comp.x * GRID_SIZE, originPx.y + comp.y * GRID_SIZE);
  ctx.rotate((comp.rotation * Math.PI) / 180);
  def.draw(ctx, comp);
  ctx.fillStyle = '#5cc8ff';
  for (const t of def.terminals) {
    ctx.beginPath();
    ctx.arc(t.x * GRID_SIZE, t.y * GRID_SIZE, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSelectionBox(ctx, comp, def, originPx) {
  const bbox = componentBBoxGrid(comp, def);
  ctx.strokeStyle = '#ffcf5c';
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    originPx.x + bbox.minX * GRID_SIZE,
    originPx.y + bbox.minY * GRID_SIZE,
    (bbox.maxX - bbox.minX) * GRID_SIZE,
    (bbox.maxY - bbox.minY) * GRID_SIZE
  );
  ctx.setLineDash([]);
}

function drawParamLabel(ctx, comp, def, bbox, originPx) {
  if (def.params.length === 0) return;
  const text = def.params.map((p) => `${formatSI(comp.params[p.key])}${p.unit}`).join(', ');
  ctx.font = '11px system-ui';
  ctx.fillStyle = '#c8c8d0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, originPx.x + ((bbox.minX + bbox.maxX) / 2) * GRID_SIZE, originPx.y + bbox.minY * GRID_SIZE - 4);
}

function drawResultLabel(ctx, x, y, text, dy = -6) {
  ctx.font = '11px system-ui';
  ctx.fillStyle = '#ffe08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, x, y + dy);
}

function currentStepIndex(runResult, state) {
  if (!runResult || runResult.kind !== 'transient') return null;
  return Math.max(0, Math.min(runResult.times.length - 1, Math.floor(state.scrubIndex)));
}

function voltageAt(runResult, stepIdx, componentId, terminalIndex) {
  return runResult.kind === 'dc'
    ? dcTerminalVoltage(runResult, componentId, terminalIndex)
    : terminalVoltageAt(runResult, stepIdx, componentId, terminalIndex);
}

function currentOf(runResult, stepIdx, componentId) {
  if (runResult.kind === 'dc') {
    const comp = runResult.built.components.find((c) => c.id === componentId);
    return comp ? resolvedCurrent(comp, runResult.result.x) : undefined;
  }
  return componentCurrentAt(runResult, stepIdx, componentId);
}

// A wire itself has no solved unknown; approximate it with whichever
// endpoint has a well-defined current (falling through to the other side
// when one end is a ground component, which has no device/current at all).
function wireCurrent(runResult, wire, stepIdx) {
  const fromCurrent = currentOf(runResult, stepIdx, wire.from.componentId);
  if (fromCurrent !== undefined) return fromCurrent;
  const toCurrent = currentOf(runResult, stepIdx, wire.to.componentId);
  if (toCurrent !== undefined) return -toCurrent;
  return 0;
}

export function drawScene(ctx, canvas, state, catalog, originPx) {
  const { schematic, runResult } = state;
  const stepIdx = currentStepIndex(runResult, state);
  drawGrid(ctx, canvas, originPx);

  for (const wire of schematic.wires) {
    const ends = wireEndpointsPx(wire, schematic, catalog, originPx);
    if (!ends) continue;
    const route = wireRoutePoints(ends.from, ends.to);
    const selected = state.selection?.kind === 'wire' && state.selection.id === wire.id;
    drawWire(ctx, route, selected);
    if (runResult) {
      drawCurrentFlow(ctx, route, wireCurrent(runResult, wire, stepIdx));
    }
  }

  if (state.pendingWire) {
    const comp = schematic.components.find((c) => c.id === state.pendingWire.componentId);
    if (comp) {
      const def = catalog[comp.type];
      const g = terminalGridPos(comp, def, state.pendingWire.terminalIndex);
      const start = { x: originPx.x + g.x * GRID_SIZE, y: originPx.y + g.y * GRID_SIZE };
      ctx.setLineDash([5, 4]);
      drawWire(ctx, wireRoutePoints(start, state.mousePx), false);
      ctx.setLineDash([]);
    }
  }

  for (const comp of schematic.components) {
    const def = catalog[comp.type];
    drawComponentBody(ctx, comp, def, originPx);
    if (state.selection?.kind === 'component' && state.selection.id === comp.id) {
      drawSelectionBox(ctx, comp, def, originPx);
    }
    drawParamLabel(ctx, comp, def, componentBBoxGrid(comp, def), originPx);
  }

  if (state.hoverTerminal) {
    const comp = schematic.components.find((c) => c.id === state.hoverTerminal.componentId);
    if (comp) {
      const def = catalog[comp.type];
      const g = terminalGridPos(comp, def, state.hoverTerminal.terminalIndex);
      ctx.beginPath();
      ctx.arc(originPx.x + g.x * GRID_SIZE, originPx.y + g.y * GRID_SIZE, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffcf5c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Probe markers: a colored ring at the probed terminal (voltage) or a
  // colored bracket around the probed component (current), matching that
  // probe's scope trace color.
  state.probes.forEach((probe, idx) => {
    const comp = schematic.components.find((c) => c.id === probe.componentId);
    if (!comp) return;
    const def = catalog[comp.type];
    ctx.strokeStyle = probeColor(idx);
    ctx.lineWidth = 2;
    if (probe.kind === 'voltage') {
      const g = terminalGridPos(comp, def, probe.terminalIndex);
      ctx.beginPath();
      ctx.arc(originPx.x + g.x * GRID_SIZE, originPx.y + g.y * GRID_SIZE, 8, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const bbox = componentBBoxGrid(comp, def);
      ctx.strokeRect(
        originPx.x + bbox.minX * GRID_SIZE - 3,
        originPx.y + bbox.minY * GRID_SIZE - 3,
        (bbox.maxX - bbox.minX) * GRID_SIZE + 6,
        (bbox.maxY - bbox.minY) * GRID_SIZE + 6
      );
    }
  });

  if (runResult) {
    for (const comp of schematic.components) {
      if (comp.type === 'ground') continue;
      const def = catalog[comp.type];

      def.terminals.forEach((_, i) => {
        const g = terminalGridPos(comp, def, i);
        const v = voltageAt(runResult, stepIdx, comp.id, i);
        drawResultLabel(ctx, originPx.x + g.x * GRID_SIZE, originPx.y + g.y * GRID_SIZE, `${v.toFixed(2)}V`);
      });

      const current = currentOf(runResult, stepIdx, comp.id);
      if (current !== undefined) {
        const g = terminalGridPos(comp, def, 0);
        drawResultLabel(
          ctx,
          originPx.x + g.x * GRID_SIZE,
          originPx.y + g.y * GRID_SIZE,
          `I=${(current * 1000).toFixed(2)}mA`,
          10
        );
      }
    }
  }
}
