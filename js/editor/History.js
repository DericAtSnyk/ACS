// Undo/redo for the schematic via whole-document snapshots. A schematic is
// just a few arrays of plain data, so serializing it to JSON is cheap and
// far less error-prone than recording per-operation inverse commands.
//
// Callers snapshot BEFORE mutating, then call recordChange() afterwards: it
// compares against the current state and only pushes an undo entry if
// something really changed (so a click that cancels a wire, or a drag that
// ends where it began, leaves no history).
const DEFAULT_LIMIT = 100;
const COALESCE_WINDOW_MS = 800;

export function createHistory(limit = DEFAULT_LIMIT) {
  return { undoStack: [], redoStack: [], limit, lastKey: null, lastTime: 0 };
}

export function takeSnapshot(schematic) {
  return JSON.stringify(schematic);
}

// `key` coalesces rapid-fire edits to the same thing (typing into a
// parameter field) into a single undo step: while the same key keeps
// repeating within the window, only the first "before" snapshot is kept.
export function recordChange(history, beforeSnapshot, schematic, { key = null, now = Date.now() } = {}) {
  if (takeSnapshot(schematic) === beforeSnapshot) return false;

  const coalesce = key !== null && key === history.lastKey && now - history.lastTime <= COALESCE_WINDOW_MS;
  history.lastKey = key;
  history.lastTime = now;
  history.redoStack.length = 0;
  if (coalesce) return true;

  history.undoStack.push(beforeSnapshot);
  if (history.undoStack.length > history.limit) history.undoStack.shift();
  return true;
}

function restore(from, to, schematic) {
  const snapshot = from.pop();
  to.push(takeSnapshot(schematic));
  return JSON.parse(snapshot);
}

// Returns the previous schematic, or null if there's nothing to undo.
export function undo(history, schematic) {
  if (history.undoStack.length === 0) return null;
  history.lastKey = null;
  return restore(history.undoStack, history.redoStack, schematic);
}

export function redo(history, schematic) {
  if (history.redoStack.length === 0) return null;
  history.lastKey = null;
  return restore(history.redoStack, history.undoStack, schematic);
}

export function canUndo(history) {
  return history.undoStack.length > 0;
}

export function canRedo(history) {
  return history.redoStack.length > 0;
}

export function clearHistory(history) {
  history.undoStack.length = 0;
  history.redoStack.length = 0;
  history.lastKey = null;
}
