import test from 'node:test';
import assert from 'node:assert/strict';
import { Circuit } from '../js/core/Circuit.js';
import { solveLinearDC, nodeVoltage, branchCurrent } from '../js/core/Solver.js';
import { runTransient } from '../js/core/Transient.js';

test('diode half-wave rectifier: negative half-cycle is clamped near 0V, positive half passes through minus Vf', () => {
  const R = 1000;
  const Is = 1e-14;

  const circuit = new Circuit();
  circuit.addComponent('vsource_sine', ['1', '0'], { amplitude: 5, frequency: 100, phaseDeg: 0, offset: 0 });
  circuit.addComponent('diode', ['1', '2'], { saturationCurrent: Is, n: 1 });
  circuit.addComponent('resistor', ['2', '0'], { resistance: R });

  const period = 1 / 100;
  const dt = period / 200;
  const { built, times, snapshots } = runTransient(circuit, { tStop: period, dt });
  const outIdx = built.nodeIndexOf('2');

  // Quarter period (t = T/4): source is at its positive peak (+5V) — diode
  // conducts, so the output should be close to 5V minus a small forward drop.
  const posPeakStep = Math.round(times.length / 4);
  const vOutAtPosPeak = snapshots[posPeakStep].x[outIdx];
  assert.ok(vOutAtPosPeak > 4, `expected output near +5V (minus Vf) at positive peak, got ${vOutAtPosPeak}`);

  // Three-quarters period (t = 3T/4): source is at its negative peak (-5V) —
  // diode is reverse biased and blocks conduction, so the output stays near 0V.
  const negPeakStep = Math.round((3 * times.length) / 4);
  const vOutAtNegPeak = snapshots[negPeakStep].x[outIdx];
  assert.ok(Math.abs(vOutAtNegPeak) < 0.01, `expected output near 0V at negative peak, got ${vOutAtNegPeak}`);
});

test('ideal op-amp voltage follower: output tracks input', () => {
  for (const vin of [1.5, -2.3, 0, 4.9]) {
    const circuit = new Circuit();
    circuit.addComponent('vsource', ['in', '0'], { voltage: vin });
    // Voltage follower: output wired directly back to the inverting input.
    circuit.addComponent('opamp', ['in', 'out', 'out'], {});
    circuit.addComponent('resistor', ['out', '0'], { resistance: 10000 });

    const built = circuit.build();
    const result = solveLinearDC(built);
    const vout = nodeVoltage(built, result, 'out');
    assert.ok(Math.abs(vout - vin) < 1e-6, `expected output ${vin}V, got ${vout}`);
  }
});

test('ideal op-amp inverting amplifier: gain = -Rf/Rin', () => {
  const Rin = 1000;
  const Rf = 5000;
  const vin = 0.8;

  const circuit = new Circuit();
  circuit.addComponent('vsource', ['in', '0'], { voltage: vin });
  circuit.addComponent('resistor', ['in', 'inv'], { resistance: Rin });
  circuit.addComponent('resistor', ['inv', 'out'], { resistance: Rf });
  circuit.addComponent('opamp', ['0', 'inv', 'out'], {}); // non-inverting input grounded

  const built = circuit.build();
  const result = solveLinearDC(built);
  const vout = nodeVoltage(built, result, 'out');
  const expected = -vin * (Rf / Rin);
  assert.ok(Math.abs(vout - expected) < 1e-6, `expected ${expected}V, got ${vout}`);
});

test('BJT common-emitter switch: base high saturates (Vc low), base low cuts off (Vc near Vcc)', () => {
  const Vcc = 5;
  const Rc = 1000;
  const Rb = 10000;

  function collectorVoltage(vBaseDrive) {
    const circuit = new Circuit();
    circuit.addComponent('vsource', ['vcc', '0'], { voltage: Vcc });
    circuit.addComponent('resistor', ['vcc', 'c'], { resistance: Rc });
    circuit.addComponent('vsource', ['vbase', '0'], { voltage: vBaseDrive });
    circuit.addComponent('resistor', ['vbase', 'b'], { resistance: Rb });
    circuit.addComponent('bjt_npn', ['b', 'c', '0'], { saturationCurrent: 1e-15, betaF: 100, betaR: 1 });

    const built = circuit.build();
    const result = solveLinearDC(built);
    return nodeVoltage(built, result, 'c');
  }

  const vcOn = collectorVoltage(5);
  const vcOff = collectorVoltage(0);

  assert.ok(vcOn < 0.5, `expected saturated collector voltage well below Vcc, got ${vcOn}`);
  assert.ok(vcOff > 4.5, `expected cutoff collector voltage near Vcc=${Vcc}, got ${vcOff}`);
});

test('NMOS switch: gate high pulls source-follower node up, gate low leaves it near 0V', () => {
  const Vdd = 5;
  const Rd = 1000;

  function drainVoltage(vGate) {
    const circuit = new Circuit();
    circuit.addComponent('vsource', ['vdd', '0'], { voltage: Vdd });
    circuit.addComponent('resistor', ['vdd', 'd'], { resistance: Rd });
    circuit.addComponent('vsource', ['g', '0'], { voltage: vGate });
    circuit.addComponent('nmos', ['g', 'd', '0'], { thresholdVoltage: 2, transconductance: 2e-3 });

    const built = circuit.build();
    const result = solveLinearDC(built);
    return nodeVoltage(built, result, 'd');
  }

  const vdOn = drainVoltage(5); // Vgs=5 >> Vt=2: transistor conducts, pulls drain down
  const vdOff = drainVoltage(0); // Vgs=0 < Vt: cutoff, no current, drain stays at Vdd

  assert.ok(vdOn < Vdd - 0.5, `expected conducting drain voltage below Vdd, got ${vdOn}`);
  assert.ok(Math.abs(vdOff - Vdd) < 1e-6, `expected cutoff drain voltage at Vdd=${Vdd}, got ${vdOff}`);
});
