import test from 'node:test';
import assert from 'node:assert/strict';
import { Circuit } from '../js/core/Circuit.js';
import { runACSweep } from '../js/core/AC.js';
import { mag, phaseDeg } from '../js/core/Complex.js';

function gainAt(result, freqIndex, nodeLabel) {
  const idx = result.built.nodeIndexOf(nodeLabel);
  return result.snapshots[freqIndex][idx];
}

test('RC low-pass: gain is -3.0103 dB at the corner frequency f_c = 1/(2*pi*R*C)', () => {
  const R = 1000;
  const C = 1e-6;
  const fc = 1 / (2 * Math.PI * R * C);

  const circuit = new Circuit();
  circuit.addComponent('vsource_sine', ['in', '0'], { amplitude: 1, frequency: 1000, phaseDeg: 0, offset: 0 });
  circuit.addComponent('resistor', ['in', 'out'], { resistance: R });
  circuit.addComponent('capacitor', ['out', '0'], { capacitance: C });

  const result = runACSweep(circuit, { fStart: fc, fStop: fc * 1.0001, points: 1 });
  const z = gainAt(result, 0, 'out');
  const gainDb = 20 * Math.log10(mag(z));

  assert.ok(Math.abs(gainDb - -3.0103) < 1e-3, `expected ~-3.01 dB at f_c, got ${gainDb}`);
  assert.ok(Math.abs(phaseDeg(z) - -45) < 1e-2, `expected ~-45 deg at f_c, got ${phaseDeg(z)}`);
});

test('RC low-pass: passes near 0 dB well below f_c and rolls off ~20 dB/decade well above it', () => {
  const R = 1000;
  const C = 1e-6;
  const fc = 1 / (2 * Math.PI * R * C);

  const circuit = new Circuit();
  circuit.addComponent('vsource_sine', ['in', '0'], { amplitude: 1, frequency: 1000 });
  circuit.addComponent('resistor', ['in', 'out'], { resistance: R });
  circuit.addComponent('capacitor', ['out', '0'], { capacitance: C });

  const result = runACSweep(circuit, { fStart: fc / 100, fStop: fc * 100, points: 5, sweep: 'log' });
  const lowGainDb = 20 * Math.log10(mag(gainAt(result, 0, 'out')));
  const highGainDb = 20 * Math.log10(mag(gainAt(result, 4, 'out')));

  assert.ok(Math.abs(lowGainDb) < 0.01, `expected ~0 dB two decades below f_c, got ${lowGainDb}`);
  // Two decades above f_c: ~-40 dB down from the passband.
  assert.ok(Math.abs(highGainDb - -40) < 0.5, `expected ~-40 dB two decades above f_c, got ${highGainDb}`);
});

test('RC high-pass: gain is -3.0103 dB at the corner frequency, approaches 0 dB above it', () => {
  const R = 1000;
  const C = 1e-6;
  const fc = 1 / (2 * Math.PI * R * C);

  const circuit = new Circuit();
  circuit.addComponent('vsource_sine', ['in', '0'], { amplitude: 1, frequency: 1000 });
  circuit.addComponent('capacitor', ['in', 'out'], { capacitance: C });
  circuit.addComponent('resistor', ['out', '0'], { resistance: R });

  const result = runACSweep(circuit, { fStart: fc, fStop: fc * 100, points: 2, sweep: 'log' });
  const gainAtFc = 20 * Math.log10(mag(gainAt(result, 0, 'out')));
  const gainAbove = 20 * Math.log10(mag(gainAt(result, 1, 'out')));

  assert.ok(Math.abs(gainAtFc - -3.0103) < 1e-3, `expected ~-3.01 dB at f_c, got ${gainAtFc}`);
  assert.ok(gainAbove > gainAtFc, 'gain should rise above the corner frequency');
});

test('resistive divider: flat 0 dB / 0 deg gain across the whole sweep', () => {
  const circuit = new Circuit();
  circuit.addComponent('vsource_sine', ['in', '0'], { amplitude: 2, frequency: 1000 });
  circuit.addComponent('resistor', ['in', 'out'], { resistance: 100 });
  circuit.addComponent('resistor', ['out', '0'], { resistance: 100 });

  const result = runACSweep(circuit, { fStart: 10, fStop: 1e6, points: 5, sweep: 'log' });
  for (let i = 0; i < result.freqs.length; i++) {
    const z = gainAt(result, i, 'out');
    const gainDb = 20 * Math.log10(mag(z) / 2); // normalize against the 2V stimulus amplitude
    assert.ok(Math.abs(gainDb - -6.0206) < 1e-6, `expected -6.02 dB (1/2 in dB) at freq index ${i}, got ${gainDb}`);
    assert.ok(Math.abs(phaseDeg(z)) < 1e-6, `expected 0 deg phase at freq index ${i}, got ${phaseDeg(z)}`);
  }
});

test('RL low-pass (L in series, R to ground): phase approaches -90 deg at high frequency', () => {
  const R = 1000;
  const L = 1e-3;

  const circuit = new Circuit();
  circuit.addComponent('vsource_sine', ['in', '0'], { amplitude: 1, frequency: 1000 });
  circuit.addComponent('inductor', ['in', 'out'], { inductance: L });
  circuit.addComponent('resistor', ['out', '0'], { resistance: R });

  const fHigh = (100 * R) / (2 * Math.PI * L); // where wL >> R
  const result = runACSweep(circuit, { fStart: fHigh, fStop: fHigh * 1.0001, points: 1 });
  const z = gainAt(result, 0, 'out');

  assert.ok(mag(z) < 0.02, `expected small gain at high frequency, got ${mag(z)}`);
  assert.ok(phaseDeg(z) < -85, `expected phase near -90 deg at high frequency, got ${phaseDeg(z)}`);
});

test('a plain DC vsource contributes no AC signal (acts as an AC short)', () => {
  const circuit = new Circuit();
  circuit.addComponent('vsource', ['bias', '0'], { voltage: 5 });
  circuit.addComponent('resistor', ['bias', 'out'], { resistance: 100 });
  circuit.addComponent('resistor', ['out', '0'], { resistance: 100 });

  const result = runACSweep(circuit, { fStart: 1000, fStop: 2000, points: 2 });
  const z = gainAt(result, 0, 'out');
  assert.ok(mag(z) < 1e-9, `expected ~0 AC amplitude driven only by a DC source, got ${mag(z)}`);
});
