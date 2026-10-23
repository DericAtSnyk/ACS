import test from 'node:test';
import assert from 'node:assert/strict';
import { Circuit } from '../js/core/Circuit.js';
import { solveLinearDC, nodeVoltage } from '../js/core/Solver.js';
import { runTransient } from '../js/core/Transient.js';
import { runACSweep } from '../js/core/AC.js';
import { mag } from '../js/core/Complex.js';
import { pulseValue } from '../js/components/devices/vsourcePulse.js';

function dcVoltage(circuit, label) {
  const built = circuit.build();
  const result = solveLinearDC(built);
  return nodeVoltage(built, result, label);
}

test('pulseValue traces delay, rise, high, fall, low and repeats each period', () => {
  const p = { v1: 0, v2: 5, delay: 1, rise: 1, fall: 1, width: 2, period: 10 };
  assert.equal(pulseValue(p, 0.5), 0); // before delay
  assert.equal(pulseValue(p, 1.5), 2.5); // halfway up the rising edge
  assert.equal(pulseValue(p, 3), 5); // flat top
  assert.equal(pulseValue(p, 4.5), 2.5); // halfway down the falling edge
  assert.equal(pulseValue(p, 7), 0); // low for the rest of the period
  assert.equal(pulseValue(p, 13), 5); // second period, flat top again
});

test('pulse source drives an RC filter that charges while high and discharges while low', () => {
  const circuit = new Circuit();
  circuit.addComponent('vsource_pulse', ['in', '0'], {
    v1: 0, v2: 5, delay: 0, rise: 1e-6, fall: 1e-6, width: 5e-3, period: 10e-3,
  });
  circuit.addComponent('resistor', ['in', 'out'], { resistance: 1000 });
  circuit.addComponent('capacitor', ['out', '0'], { capacitance: 1e-6 });

  const dt = 1e-5;
  const { built, snapshots } = runTransient(circuit, { tStop: 10e-3, dt });
  const idx = built.nodeIndexOf('out');
  // RC = 1 ms: after 5 ms high the cap is ~99% charged; after 5 more ms low it's ~0.
  assert.ok(snapshots[Math.round(5e-3 / dt)].x[idx] > 4.9);
  assert.ok(snapshots[Math.round(10e-3 / dt)].x[idx] < 0.1);
});

test('zener: conducts forward like a diode, and clamps near Vz in reverse', () => {
  // Reverse regulator: 12V -> 1k -> cathode, anode grounded.
  const reg = new Circuit();
  reg.addComponent('vsource', ['in', '0'], { voltage: 12 });
  reg.addComponent('resistor', ['in', 'out'], { resistance: 1000 });
  reg.addComponent('zener', ['0', 'out'], { zenerVoltage: 5.1 });
  const vOut = dcVoltage(reg, 'out');
  assert.ok(vOut > 5.0 && vOut < 5.3, `expected ~5.1V, got ${vOut}`);

  // Below breakdown it blocks: 3V stays 3V.
  const low = new Circuit();
  low.addComponent('vsource', ['in', '0'], { voltage: 3 });
  low.addComponent('resistor', ['in', 'out'], { resistance: 1000 });
  low.addComponent('zener', ['0', 'out'], { zenerVoltage: 5.1 });
  assert.ok(Math.abs(dcVoltage(low, 'out') - 3) < 0.01);

  // Forward biased: ~0.6-0.8V drop.
  const fwd = new Circuit();
  fwd.addComponent('vsource', ['in', '0'], { voltage: 5 });
  fwd.addComponent('resistor', ['in', 'out'], { resistance: 1000 });
  fwd.addComponent('zener', ['out', '0'], { zenerVoltage: 5.1 });
  const vf = dcVoltage(fwd, 'out');
  assert.ok(vf > 0.5 && vf < 0.85, `expected forward drop, got ${vf}`);
});

test('VCVS multiplies the control voltage by its gain', () => {
  const c = new Circuit();
  c.addComponent('vsource', ['in', '0'], { voltage: 1.5 });
  c.addComponent('resistor', ['in', '0'], { resistance: 1000 });
  c.addComponent('vcvs', ['out', '0', 'in', '0'], { gain: 4 });
  c.addComponent('resistor', ['out', '0'], { resistance: 1000 });
  assert.ok(Math.abs(dcVoltage(c, 'out') - 6) < 1e-9);
});

test('VCCS pushes gm*Vctrl through the load', () => {
  const c = new Circuit();
  c.addComponent('vsource', ['in', '0'], { voltage: 2 });
  // Current flows out+ -> out- through the device, so out- is where it lands;
  // put the load from out- to ground with out+ grounded.
  c.addComponent('vccs', ['0', 'out', 'in', '0'], { transconductance: 1e-3 });
  c.addComponent('resistor', ['out', '0'], { resistance: 1000 });
  // 2 mA into 'out' across 1k = 2V.
  assert.ok(Math.abs(dcVoltage(c, 'out') - 2) < 1e-9);
});

test('ideal transformer scales voltage by ratio and current inversely', () => {
  const c = new Circuit();
  c.addComponent('vsource', ['p', '0'], { voltage: 10 });
  c.addComponent('transformer', ['p', '0', 's', '0'], { ratio: 3 });
  c.addComponent('resistor', ['s', '0'], { resistance: 100 });
  const built = c.build();
  const result = solveLinearDC(built);
  assert.ok(Math.abs(nodeVoltage(built, result, 's') - 30) < 1e-9);
  // Secondary delivers 0.3A, so the primary draws 0.9A (the vsource sinks -0.9A).
  const vs = built.components.find((x) => x.type === 'vsource');
  assert.ok(Math.abs(result.x[vs.extraIdx[0]] - -0.9) < 1e-9);
});

test('transformer + VCVS keep their gain across an AC sweep', () => {
  const c = new Circuit();
  c.addComponent('vsource_sine', ['in', '0'], { amplitude: 1, frequency: 1000 });
  c.addComponent('transformer', ['in', '0', 'mid', '0'], { ratio: 2 });
  c.addComponent('vcvs', ['out', '0', 'mid', '0'], { gain: 5 });
  c.addComponent('resistor', ['out', '0'], { resistance: 1000 });
  const result = runACSweep(c, { fStart: 100, fStop: 10000, points: 3 });
  const idx = result.built.nodeIndexOf('out');
  for (const snap of result.snapshots) assert.ok(Math.abs(mag(snap[idx]) - 10) < 1e-9);
});
