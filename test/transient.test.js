import test from 'node:test';
import assert from 'node:assert/strict';
import { Circuit } from '../js/core/Circuit.js';
import { runTransient } from '../js/core/Transient.js';

test('RC charging: V(cap) tracks V0*(1 - e^(-t/RC)) within numerical tolerance', () => {
  const V0 = 5;
  const R = 1000;
  const C = 1e-6;
  const RC = R * C; // 1 ms

  const circuit = new Circuit();
  circuit.addComponent('vsource', ['1', '0'], { voltage: V0 });
  circuit.addComponent('resistor', ['1', '2'], { resistance: R });
  circuit.addComponent('capacitor', ['2', '0'], { capacitance: C });

  const dt = 1e-6; // 1us steps, well under RC
  const tStop = 5 * RC;
  const { built, times, snapshots } = runTransient(circuit, { tStop, dt });

  const capIdx = built.nodeIndexOf('2');
  assert.notEqual(capIdx, -1);

  // Check several points along the charging curve.
  for (const targetT of [RC, 2 * RC, 3 * RC, 5 * RC]) {
    const stepIndex = Math.round(targetT / dt);
    const t = times[stepIndex];
    const simulated = snapshots[stepIndex].x[capIdx];
    const analytical = V0 * (1 - Math.exp(-t / RC));
    assert.ok(
      Math.abs(simulated - analytical) < 0.01,
      `at t=${t}s expected ~${analytical} got ${simulated}`
    );
  }

  // Starts near 0V (capacitor initially uncharged — trapezoidal integration's
  // very first step already uses the companion model, so it's not exactly
  // 0, just very small relative to V0 given how tiny dt is next to RC) and
  // ends near V0 (fully charged).
  assert.ok(Math.abs(snapshots[0].x[capIdx] - 0) < 0.01);
  assert.ok(Math.abs(snapshots[snapshots.length - 1].x[capIdx] - V0) < 0.05);
});

test('RL current rise: I(inductor) tracks (V0/R)*(1 - e^(-tR/L)) within numerical tolerance', () => {
  const V0 = 10;
  const R = 100;
  const L = 0.01; // 10 mH
  const tau = L / R; // 100 us

  const circuit = new Circuit();
  const vid = circuit.addComponent('vsource', ['1', '0'], { voltage: V0 });
  circuit.addComponent('resistor', ['1', '2'], { resistance: R });
  circuit.addComponent('inductor', ['2', '0'], { inductance: L });

  const dt = tau / 200;
  const tStop = 5 * tau;
  const { built, times, snapshots } = runTransient(circuit, { tStop, dt });

  const vsourceComp = built.components.find((c) => c.id === vid);

  for (const targetT of [tau, 2 * tau, 5 * tau]) {
    const stepIndex = Math.round(targetT / dt);
    const t = times[stepIndex];
    // Current through the source branch equals -I(inductor) by the vsource's
    // sign convention (current flows from + into the external circuit).
    const simulated = -snapshots[stepIndex].x[vsourceComp.extraIdx[0]];
    const analytical = (V0 / R) * (1 - Math.exp((-t * R) / L));
    assert.ok(
      Math.abs(simulated - analytical) < 0.005,
      `at t=${t}s expected ~${analytical} got ${simulated}`
    );
  }
});
