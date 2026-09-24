// Bootstraps the schematic editor and wires all the editor/sim/io modules
// together. This is the only module that touches the DOM's top-level event
// listeners; everything else is a focused, importable function.
import { catalog } from './components/catalog.js';
import {
  createSchematic,
  addComponent,
  removeComponent,
  removeWire,
  moveComponent,
  rotateComponent,
  findComponent,
} from './editor/Schematic.js';
import { pixelToGrid, snapToGrid } from './editor/Geometry.js';
import { drawScene } from './editor/CanvasRenderer.js';
import { renderPalette } from './editor/Palette.js';
import { setupDragDrop } from './editor/DragDrop.js';
import { findTerminalNear, startOrFinishWire, cancelPendingWire } from './editor/WireTool.js';
import { findComponentAt, findWireNear } from './editor/Selection.js';
import { renderProperties } from './editor/PropertiesPanel.js';
import { runDC } from './sim/RunDC.js';
import { runTransientFromSchematic } from './sim/RunTransient.js';
import { startPlayback, pausePlayback, stopPlayback, tickPlayback } from './sim/Player.js';
import { toggleVoltageProbe, toggleCurrentProbe } from './sim/ProbeManager.js';
import { drawScope } from './sim/Scope.js';
import { exportSchematicToFile, importSchematicFromFile } from './io/SchematicIO.js';

const ORIGIN_PX = { x: 40, y: 40 };

const state = {
  schematic: createSchematic(),
  selection: null, // { kind: 'component' | 'wire', id }
  pendingWire: null, // { componentId, terminalIndex }
  hoverTerminal: null,
  mousePx: { x: 0, y: 0 },
  dragging: null, // { componentId, grabDx, grabDy }
  runResult: null, // { kind: 'dc', built, result } | { kind: 'transient', built, times, snapshots }
  probeMode: false,
  probes: [],
  scrubIndex: 0,
  playing: false,
};

const canvas = document.getElementById('schematic-canvas');
const ctx = canvas.getContext('2d');
const scopeCanvas = document.getElementById('scope-canvas');
const scopeCtx = scopeCanvas.getContext('2d');
const paletteEl = document.getElementById('palette');
const propertiesEl = document.getElementById('properties');
const statusEl = document.getElementById('status');
const probeBtn = document.getElementById('probe-btn');
const scrubSlider = document.getElementById('scrub-slider');
const timeReadout = document.getElementById('time-readout');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('status-error', isError);
}

// Like setStatus, but for messages that embed a bit of markup (e.g. the
// imported file name shown in bold) rather than plain text.
function setStatusHtml(html, isError = false) {
  statusEl.innerHTML = html;
  statusEl.classList.toggle('status-error', isError);
}

function invalidateRun() {
  state.runResult = null;
  scrubSlider.max = '0';
  scrubSlider.value = '0';
  scrubSlider.disabled = true;
  timeReadout.textContent = '–';
}

function render() {
  // Probes reference a componentId directly; once that component is gone
  // (deleted, or the schematic was cleared) the probe is meaningless.
  state.probes = state.probes.filter((p) => findComponent(state.schematic, p.componentId));
  drawScene(ctx, canvas, state, catalog, ORIGIN_PX);
  drawScope(scopeCtx, scopeCanvas, state);
  renderProperties(propertiesEl, state, catalog, () => {
    invalidateRun();
    render();
  });

  if (state.runResult?.kind === 'transient') {
    const idx = Math.floor(state.scrubIndex);
    const t = state.runResult.times[idx] ?? 0;
    const tMax = state.runResult.times[state.runResult.times.length - 1];
    timeReadout.textContent = `${(t * 1000).toFixed(3)} / ${(tMax * 1000).toFixed(3)} ms`;
    scrubSlider.max = String(state.runResult.times.length - 1);
    scrubSlider.disabled = false;
    scrubSlider.value = String(idx);
  }
}

renderPalette(paletteEl, catalog);
setupDragDrop(canvas, state, catalog, { addComponent }, ORIGIN_PX, () => {
  invalidateRun();
  render();
});

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  state.mousePx = { x: px, y: py };

  if (state.probeMode) {
    const hitTerminal = findTerminalNear(state.schematic, catalog, px, py, ORIGIN_PX);
    if (hitTerminal) {
      const comp = findComponent(state.schematic, hitTerminal.componentId);
      const label = `${catalog[comp.type].label} V${hitTerminal.terminalIndex} (${comp.id.slice(-4)})`;
      toggleVoltageProbe(state, hitTerminal.componentId, hitTerminal.terminalIndex, label);
      render();
      return;
    }
    const grid = pixelToGrid(px, py, ORIGIN_PX);
    const hitComponentId = findComponentAt(state.schematic, catalog, grid.x, grid.y);
    if (hitComponentId) {
      const comp = findComponent(state.schematic, hitComponentId);
      const label = `${catalog[comp.type].label} I (${comp.id.slice(-4)})`;
      toggleCurrentProbe(state, hitComponentId, label);
      render();
    }
    return;
  }

  const hitTerminal = findTerminalNear(state.schematic, catalog, px, py, ORIGIN_PX);
  if (hitTerminal) {
    startOrFinishWire(state, hitTerminal);
    invalidateRun();
    render();
    return;
  }

  const grid = pixelToGrid(px, py, ORIGIN_PX);
  const hitComponentId = findComponentAt(state.schematic, catalog, grid.x, grid.y);
  if (hitComponentId) {
    state.selection = { kind: 'component', id: hitComponentId };
    const comp = findComponent(state.schematic, hitComponentId);
    state.dragging = {
      componentId: hitComponentId,
      grabDx: grid.x - comp.x,
      grabDy: grid.y - comp.y,
    };
    render();
    return;
  }

  const hitWireId = findWireNear(state.schematic, catalog, px, py, ORIGIN_PX);
  if (hitWireId) {
    state.selection = { kind: 'wire', id: hitWireId };
    render();
    return;
  }

  state.selection = null;
  cancelPendingWire(state);
  render();
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  state.mousePx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  state.hoverTerminal = findTerminalNear(state.schematic, catalog, state.mousePx.x, state.mousePx.y, ORIGIN_PX);

  if (state.dragging) {
    const grid = pixelToGrid(state.mousePx.x, state.mousePx.y, ORIGIN_PX);
    const snapped = snapToGrid(grid.x - state.dragging.grabDx, grid.y - state.dragging.grabDy);
    moveComponent(state.schematic, state.dragging.componentId, snapped.x, snapped.y);
    invalidateRun();
  }

  if (state.dragging || state.pendingWire || state.hoverTerminal) render();
});

window.addEventListener('mouseup', () => {
  if (state.dragging) {
    state.dragging = null;
    render();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cancelPendingWire(state);
    state.selection = null;
    render();
    return;
  }

  if (!state.selection) return;

  if (e.key === 'r' || e.key === 'R') {
    if (state.selection.kind === 'component') {
      rotateComponent(state.schematic, state.selection.id);
      invalidateRun();
      render();
    }
    return;
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (state.selection.kind === 'component') {
      removeComponent(state.schematic, state.selection.id);
    } else if (state.selection.kind === 'wire') {
      removeWire(state.schematic, state.selection.id);
    }
    state.selection = null;
    invalidateRun();
    render();
  }
});

probeBtn.addEventListener('click', () => {
  state.probeMode = !state.probeMode;
  probeBtn.classList.toggle('active', state.probeMode);
  canvas.style.cursor = state.probeMode ? 'copy' : 'crosshair';
});

document.getElementById('run-btn').addEventListener('click', () => {
  try {
    const result = runDC(state.schematic, catalog);
    state.runResult = { kind: 'dc', ...result };
    setStatus(`Solved: ${result.built.numNodes} node(s), ${result.built.numExtra} branch current unknown(s).`);
  } catch (err) {
    state.runResult = null;
    setStatus(err.message, true);
  }
  render();
});

document.getElementById('run-transient-btn').addEventListener('click', () => {
  const tStop = parseFloat(document.getElementById('tstop-input').value);
  const dt = parseFloat(document.getElementById('dt-input').value);
  if (!(tStop > 0) || !(dt > 0) || dt >= tStop) {
    setStatus('Enter a positive stop time and a step smaller than the stop time.', true);
    return;
  }
  try {
    const result = runTransientFromSchematic(state.schematic, catalog, { tStop, dt });
    state.runResult = { kind: 'transient', ...result };
    state.scrubIndex = 0;
    state.playing = false;
    setStatus(`Transient solved: ${result.times.length} steps over ${(tStop * 1000).toFixed(3)}ms.`);
  } catch (err) {
    state.runResult = null;
    setStatus(err.message, true);
  }
  render();
});

document.getElementById('play-btn').addEventListener('click', () => startPlayback(state));
document.getElementById('pause-btn').addEventListener('click', () => {
  pausePlayback(state);
  render();
});
document.getElementById('stop-btn').addEventListener('click', () => {
  stopPlayback(state);
  render();
});

scrubSlider.addEventListener('input', () => {
  if (!state.runResult || state.runResult.kind !== 'transient') return;
  pausePlayback(state);
  state.scrubIndex = parseFloat(scrubSlider.value);
  render();
});

document.getElementById('clear-btn').addEventListener('click', () => {
  state.schematic = createSchematic();
  state.selection = null;
  state.pendingWire = null;
  invalidateRun();
  setStatus('');
  render();
});

document.getElementById('export-btn').addEventListener('click', () => {
  exportSchematicToFile(state.schematic);
});

const importInput = document.getElementById('import-file');
document.getElementById('import-btn').addEventListener('click', () => importInput.click());
importInput.addEventListener('change', async () => {
  const file = importInput.files[0];
  if (!file) return;
  try {
    const data = await importSchematicFromFile(file);
    state.schematic = data;
    state.selection = null;
    state.pendingWire = null;
    invalidateRun();
    setStatusHtml(`Circuit imported: <strong>${file.name}</strong>`);
  } catch (err) {
    setStatus(`Import failed: ${err.message}`, true);
  }
  importInput.value = '';
  render();
});

let lastFrameTime = null;
function animationLoop(now) {
  if (lastFrameTime !== null && state.playing) {
    tickPlayback(state, (now - lastFrameTime) / 1000);
    render();
  }
  lastFrameTime = now;
  requestAnimationFrame(animationLoop);
}
requestAnimationFrame(animationLoop);

render();
