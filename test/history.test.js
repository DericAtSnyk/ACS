import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSchematic,
  addComponent,
  addWire,
  removeComponent,
  copyComponent,
  pasteComponent,
} from '../js/editor/Schematic.js';
import { createHistory, takeSnapshot, recordChange, undo, redo, canUndo, canRedo } from '../js/editor/History.js';

// Mirrors how main.js uses the history: snapshot, mutate, record.
function change(history, schematic, fn, opts) {
  const before = takeSnapshot(schematic);
  fn();
  return recordChange(history, before, schematic, opts);
}

test('undo restores the previous schematic and redo reapplies the change', () => {
  let s = createSchematic();
  const h = createHistory();
  change(h, s, () => addComponent(s, 'resistor', 1, 1, 0, { resistance: 100 }));
  change(h, s, () => addComponent(s, 'vsource', 5, 1, 0, { voltage: 5 }));
  assert.equal(s.components.length, 2);

  s = undo(h, s);
  assert.equal(s.components.length, 1);
  s = undo(h, s);
  assert.equal(s.components.length, 0);
  assert.equal(undo(h, s), null);
  assert.ok(canRedo(h));

  s = redo(h, s);
  s = redo(h, s);
  assert.equal(s.components.length, 2);
  assert.equal(redo(h, s), null);
});

test('a new change after undo clears the redo stack', () => {
  let s = createSchematic();
  const h = createHistory();
  change(h, s, () => addComponent(s, 'resistor', 1, 1, 0, {}));
  s = undo(h, s);
  assert.ok(canRedo(h));
  change(h, s, () => addComponent(s, 'capacitor', 2, 2, 0, {}));
  assert.ok(!canRedo(h));
});

test('a no-op mutation records nothing', () => {
  const s = createSchematic();
  const h = createHistory();
  const recorded = change(h, s, () => {});
  assert.equal(recorded, false);
  assert.ok(!canUndo(h));
});

test('undoing a component deletion also brings back its wires', () => {
  let s = createSchematic();
  const h = createHistory();
  const a = addComponent(s, 'resistor', 1, 1, 0, {});
  const b = addComponent(s, 'resistor', 5, 1, 0, {});
  addWire(s, { componentId: a, terminalIndex: 1 }, { componentId: b, terminalIndex: 0 });
  change(h, s, () => removeComponent(s, a));
  assert.equal(s.wires.length, 0);
  s = undo(h, s);
  assert.equal(s.components.length, 2);
  assert.equal(s.wires.length, 1);
});

test('edits with the same key within the window collapse into one undo step', () => {
  let s = createSchematic();
  const h = createHistory();
  const id = addComponent(s, 'resistor', 1, 1, 0, { resistance: 100 });
  const edit = (v, now) =>
    change(h, s, () => { s.components.find((c) => c.id === id).params.resistance = v; }, { key: `p:${id}`, now });
  edit(1, 1000);
  edit(10, 1100);
  edit(100, 1200);
  assert.equal(h.undoStack.length, 1);
  s = undo(h, s);
  assert.equal(s.components[0].params.resistance, 100); // back to the original, not an intermediate value

  // Outside the window it's a new step.
  const h2 = createHistory();
  const s2 = createSchematic();
  const id2 = addComponent(s2, 'resistor', 1, 1, 0, { resistance: 1 });
  const edit2 = (v, now) =>
    change(h2, s2, () => { s2.components.find((c) => c.id === id2).params.resistance = v; }, { key: 'k', now });
  edit2(2, 1000);
  edit2(3, 5000);
  assert.equal(h2.undoStack.length, 2);
});

test('history is capped at its limit, dropping the oldest entries', () => {
  const s = createSchematic();
  const h = createHistory(3);
  for (let i = 0; i < 5; i++) change(h, s, () => addComponent(s, 'resistor', i, 0, 0, {}));
  assert.equal(h.undoStack.length, 3);
});

test('copy/paste duplicates type, rotation and params with a fresh id, independent of the original', () => {
  const s = createSchematic();
  const id = addComponent(s, 'resistor', 2, 3, 90, { resistance: 4700 });
  const clip = copyComponent(s, id);
  const newId = pasteComponent(s, clip, 4, 5);

  assert.notEqual(newId, id);
  const pasted = s.components.find((c) => c.id === newId);
  assert.deepEqual({ x: pasted.x, y: pasted.y, rotation: pasted.rotation, type: pasted.type }, { x: 4, y: 5, rotation: 90, type: 'resistor' });
  assert.equal(pasted.params.resistance, 4700);

  pasted.params.resistance = 1;
  assert.equal(s.components.find((c) => c.id === id).params.resistance, 4700);

  // Still pasteable after the original is gone.
  removeComponent(s, id);
  assert.ok(pasteComponent(s, clip, 8, 8));
  assert.equal(copyComponent(s, 'missing'), null);
});
