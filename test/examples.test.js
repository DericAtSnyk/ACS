import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../js/components/catalog.js';
import { examples, buildExample } from '../js/io/Examples.js';
import { runDC, terminalVoltage } from '../js/sim/RunDC.js';
import { runTransientFromSchematic, terminalVoltageAt } from '../js/sim/RunTransient.js';
import { runACFromSchematic, terminalPhasorAt, magnitudeDb } from '../js/sim/RunAC.js';

const byId = Object.fromEntries(examples.map((e) => [e.id, e]));

function run(id) {
  const ex = byId[id];
  const built = buildExample(ex);
  const a = ex.analysis;
  let result;
  if (a.kind === 'dc') result = { kind: 'dc', ...runDC(built.schematic, catalog) };
  else if (a.kind === 'transient') result = { kind: 'transient', ...runTransientFromSchematic(built.schematic, catalog, a) };
  else result = { kind: 'ac', ...runACFromSchematic(built.schematic, catalog, a) };
  return { ...built, result };
}

// Min/max of a probed terminal's voltage over the second half of a transient
// run (past start-up transients).
function steadyRange(r, ref) {
  const [name, idx] = ref.split('.');
  const times = r.result.times;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = Math.floor(times.length / 2); i < times.length; i++) {
    const v = terminalVoltageAt(r.result, i, r.ids[name], Number(idx));
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  return { lo, hi };
}

test('every example builds a valid schematic and its suggested analysis solves', () => {
  for (const ex of examples) {
    const built = buildExample(ex);
    for (const w of built.schematic.wires.concat([])) {
      for (const end of [w.from, w.to]) {
        const comp = built.schematic.components.find((c) => c.id === end.componentId);
        assert.ok(comp, `${ex.id}: wire references a missing component`);
        assert.ok(end.terminalIndex < catalog[comp.type].terminals.length, `${ex.id}: bad terminal index`);
      }
    }
    assert.equal(built.schematic.wires.length, ex.wires.length, `${ex.id}: a wire was dropped as a duplicate`);
    assert.doesNotThrow(() => run(ex.id), `${ex.id} failed to solve`);
  }
});

test('loading an example twice yields distinct component ids', () => {
  const a = buildExample(examples[0]);
  const b = buildExample(examples[0]);
  const idsA = new Set(a.schematic.components.map((c) => c.id));
  assert.ok(b.schematic.components.every((c) => !idsA.has(c.id)));
});

test('voltage divider example: middle node is 10V * 1k/3k', () => {
  const r = run('voltage-divider');
  assert.ok(Math.abs(terminalVoltage(r.result, r.ids.r2, 0) - 10 / 3) < 1e-6);
});

test('RC step example: output reaches ~the high level by the end of the first half-period', () => {
  const r = run('rc-step');
  const idx = Math.round(5e-3 / 20e-6);
  assert.ok(terminalVoltageAt(r.result, idx, r.ids.c1, 0) > 4.9);
});

test('RC Bode example: -3dB at the 1kHz corner', () => {
  const r = run('rc-bode');
  const freqs = r.result.freqs;
  let best = 0;
  for (let i = 0; i < freqs.length; i++) if (Math.abs(freqs[i] - 1000) < Math.abs(freqs[best] - 1000)) best = i;
  const db = magnitudeDb(terminalPhasorAt(r.result, best, r.ids.c1, 0));
  assert.ok(Math.abs(db - -3.01) < 0.3, `got ${db} dB at ${freqs[best]} Hz`);
});

test('RLC band-pass example: peaks near 1/(2*pi*sqrt(LC)) at ~0 dB', () => {
  const r = run('rlc-bandpass');
  const gains = r.result.freqs.map((_, i) => magnitudeDb(terminalPhasorAt(r.result, i, r.ids.r1, 0)));
  const peak = gains.indexOf(Math.max(...gains));
  const f0 = 1 / (2 * Math.PI * Math.sqrt(10e-3 * 1e-6));
  assert.ok(Math.abs(r.result.freqs[peak] - f0) / f0 < 0.05, `peak at ${r.result.freqs[peak]} Hz, expected ~${f0}`);
  assert.ok(Math.abs(gains[peak]) < 0.5);
});

test('rectifier example: smoothed output sits near peak minus a diode drop', () => {
  const { lo, hi } = steadyRange(run('half-wave-rectifier'), 'c1.0');
  assert.ok(hi > 4 && hi < 4.7, `peak ${hi}`);
  assert.ok(lo > 2.5, `trough ${lo}`);
});

test('zener example: output is clamped near +5.1V and about -0.7V', () => {
  const { lo, hi } = steadyRange(run('zener-clipper'), 'z1.1');
  assert.ok(hi > 5 && hi < 5.5, `top ${hi}`);
  assert.ok(lo > -0.9 && lo < -0.5, `bottom ${lo}`);
});

test('inverting amplifier example: peak output is 10x the input, inverted', () => {
  const { lo, hi } = steadyRange(run('inverting-amplifier'), 'u1.2');
  assert.ok(Math.abs(hi - 5) < 0.1 && Math.abs(lo + 5) < 0.1, `range ${lo}..${hi}`);
});

test('BJT switch example: collector is pulled low when the base is driven, high when not', () => {
  const r = run('bjt-switch');
  const high = terminalVoltageAt(r.result, Math.round(0.5e-3 / 10e-6), r.ids.rc, 1);
  const low = terminalVoltageAt(r.result, Math.round(1.5e-3 / 10e-6), r.ids.rc, 1);
  assert.ok(high < 0.5, `driven: ${high}`);
  assert.ok(low > 4.5, `released: ${low}`);
});

test('transformer example: secondary peak is 4x the primary peak', () => {
  const { hi } = steadyRange(run('transformer'), 'rl.0');
  assert.ok(Math.abs(hi - 20) < 0.2, `got ${hi}`);
});
