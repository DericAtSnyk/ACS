import test from 'node:test';
import assert from 'node:assert/strict';
import { Circuit } from '../js/core/Circuit.js';
import { solveLinearDC, nodeVoltage, branchCurrent } from '../js/core/Solver.js';

test('voltage divider: V(node2) matches R2/(R1+R2) * Vsource', () => {
  const circuit = new Circuit();
  circuit.addComponent('vsource', ['1', '0'], { voltage: 10 });
  circuit.addComponent('resistor', ['1', '2'], { resistance: 100 });
  circuit.addComponent('resistor', ['2', '0'], { resistance: 200 });

  const built = circuit.build();
  const result = solveLinearDC(built);

  assert.ok(Math.abs(nodeVoltage(built, result, '1') - 10) < 1e-9);
  const expectedV2 = (10 * 200) / 300;
  assert.ok(Math.abs(nodeVoltage(built, result, '2') - expectedV2) < 1e-9);
});

test('single resistor load: vsource branch current equals -V/R (current leaves the + terminal)', () => {
  const circuit = new Circuit();
  const vid = circuit.addComponent('vsource', ['p', '0'], { voltage: 5 });
  circuit.addComponent('resistor', ['p', '0'], { resistance: 100 });

  const built = circuit.build();
  const result = solveLinearDC(built);

  assert.ok(Math.abs(nodeVoltage(built, result, 'p') - 5) < 1e-9);
  assert.ok(Math.abs(branchCurrent(built, result, vid) - -0.05) < 1e-9);
});

test('current source into a resistor to ground: V = I * R', () => {
  const circuit = new Circuit();
  circuit.addComponent('isource', ['0', 'a'], { current: 0.01 });
  circuit.addComponent('resistor', ['a', '0'], { resistance: 1000 });

  const built = circuit.build();
  const result = solveLinearDC(built);

  assert.ok(Math.abs(nodeVoltage(built, result, 'a') - 10) < 1e-9);
});

test('wire junction: connect() merges two labels into the same electrical node', () => {
  const circuit = new Circuit();
  circuit.addComponent('vsource', ['1', '0'], { voltage: 9 });
  circuit.addComponent('resistor', ['1', 'junctionA'], { resistance: 50 });
  circuit.connect('junctionA', 'junctionB');
  circuit.addComponent('resistor', ['junctionB', '0'], { resistance: 50 });

  const built = circuit.build();
  const result = solveLinearDC(built);

  assert.ok(Math.abs(nodeVoltage(built, result, 'junctionA') - 4.5) < 1e-9);
  assert.ok(Math.abs(nodeVoltage(built, result, 'junctionB') - 4.5) < 1e-9);
});

test('ground aliases (0, gnd, GND, ground) all resolve to the same node', () => {
  const circuit = new Circuit();
  circuit.addComponent('vsource', ['1', 'gnd'], { voltage: 3 });
  circuit.addComponent('resistor', ['1', 'GND'], { resistance: 10 });

  const built = circuit.build();
  const result = solveLinearDC(built);

  assert.ok(Math.abs(nodeVoltage(built, result, 'ground') - 0) < 1e-9);
  assert.ok(Math.abs(nodeVoltage(built, result, '1') - 3) < 1e-9);
});

test('singular system throws a descriptive error (floating node)', () => {
  const circuit = new Circuit();
  circuit.addComponent('resistor', ['isolated1', 'isolated2'], { resistance: 100 });

  const built = circuit.build();
  assert.throws(() => solveLinearDC(built), /under-constrained/);
});
