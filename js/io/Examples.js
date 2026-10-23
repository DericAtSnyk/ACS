// Ready-made example circuits for the "Load example" dropdown. Each one is
// described compactly (named parts at grid positions, wires between named
// terminals) and expanded into a real schematic by buildExample(), so the
// layouts stay readable here instead of being hand-edited JSON.
//
// Wires route horizontal-first (see wireRoutePoints), so each wire below is
// listed from the terminal whose row the route should leave along.
import { catalog } from '../components/catalog.js';
import { createSchematic, addComponent, addWire } from '../editor/Schematic.js';

// part: [name, type, gridX, gridY, rotation, paramOverrides?]
// wire: ['name.terminalIndex', 'name.terminalIndex']
// probes: voltage probes as ['name.terminalIndex', label]
// analysis: which run to fire after loading, with its settings.
export const examples = [
  {
    id: 'voltage-divider',
    name: 'Voltage divider (DC)',
    description: '10V across 2k + 1k: the middle node should read 3.33V.',
    parts: [
      ['v1', 'vsource', 3, 8, 90, { voltage: 10 }],
      ['r1', 'resistor', 6, 7, 0, { resistance: 2000 }],
      ['r2', 'resistor', 9, 8, 90, { resistance: 1000 }],
      ['g1', 'ground', 3, 11, 0],
      ['g2', 'ground', 9, 11, 0],
    ],
    wires: [
      ['v1.0', 'r1.0'],
      ['r1.1', 'r2.0'],
      ['v1.1', 'g1.0'],
      ['r2.1', 'g2.0'],
    ],
    probes: [],
    analysis: { kind: 'dc' },
  },
  {
    id: 'rc-step',
    name: 'RC low-pass: square-wave response',
    description: 'A 5V pulse train charges and discharges a 1k/1µF filter (τ = 1ms).',
    parts: [
      ['v1', 'vsource_pulse', 3, 8, 90, { v1: 0, v2: 5, rise: 1e-6, fall: 1e-6, width: 5e-3, period: 10e-3 }],
      ['r1', 'resistor', 8, 7, 0, { resistance: 1000 }],
      ['c1', 'capacitor', 11, 8, 90, { capacitance: 1e-6 }],
      ['g1', 'ground', 3, 11, 0],
      ['g2', 'ground', 11, 11, 0],
    ],
    wires: [
      ['v1.0', 'r1.0'],
      ['r1.1', 'c1.0'],
      ['v1.1', 'g1.0'],
      ['c1.1', 'g2.0'],
    ],
    probes: [
      ['v1.0', 'Vin'],
      ['c1.0', 'Vout'],
    ],
    analysis: { kind: 'transient', tStop: 20e-3, dt: 20e-6 },
  },
  {
    id: 'rc-bode',
    name: 'RC low-pass: Bode plot',
    description: 'The same filter tuned to 1kHz: -3dB at the corner, -20dB/decade after.',
    parts: [
      ['v1', 'vsource_sine', 3, 8, 90, { amplitude: 1, frequency: 1000 }],
      ['r1', 'resistor', 8, 7, 0, { resistance: 1000 }],
      ['c1', 'capacitor', 11, 8, 90, { capacitance: 159.15e-9 }],
      ['g1', 'ground', 3, 11, 0],
      ['g2', 'ground', 11, 11, 0],
    ],
    wires: [
      ['v1.0', 'r1.0'],
      ['r1.1', 'c1.0'],
      ['v1.1', 'g1.0'],
      ['c1.1', 'g2.0'],
    ],
    probes: [['c1.0', 'Vout']],
    analysis: { kind: 'ac', fStart: 10, fStop: 100000, points: 100, sweep: 'log' },
  },
  {
    id: 'rlc-bandpass',
    name: 'RLC band-pass: Bode plot',
    description: 'Series RLC, output across R: a resonance peak at about 1.6kHz (Q ≈ 5).',
    parts: [
      ['v1', 'vsource_sine', 3, 8, 90, { amplitude: 1, frequency: 1000 }],
      ['l1', 'inductor', 7, 7, 0, { inductance: 10e-3 }],
      ['c1', 'capacitor', 11, 7, 0, { capacitance: 1e-6 }],
      ['r1', 'resistor', 14, 8, 90, { resistance: 20 }],
      ['g1', 'ground', 3, 11, 0],
      ['g2', 'ground', 14, 11, 0],
    ],
    wires: [
      ['v1.0', 'l1.0'],
      ['l1.1', 'c1.0'],
      ['c1.1', 'r1.0'],
      ['v1.1', 'g1.0'],
      ['r1.1', 'g2.0'],
    ],
    probes: [['r1.0', 'Vout']],
    analysis: { kind: 'ac', fStart: 100, fStop: 100000, points: 150, sweep: 'log' },
  },
  {
    id: 'half-wave-rectifier',
    name: 'Half-wave rectifier with smoothing',
    description: 'A 5V/60Hz sine through a diode into a 47µF/1k load: output peaks near 4.3V with ripple.',
    parts: [
      ['v1', 'vsource_sine', 3, 8, 90, { amplitude: 5, frequency: 60 }],
      ['d1', 'diode', 8, 7, 0],
      ['c1', 'capacitor', 11, 8, 90, { capacitance: 47e-6 }],
      ['r1', 'resistor', 14, 8, 90, { resistance: 1000 }],
      ['g1', 'ground', 3, 11, 0],
      ['g2', 'ground', 11, 11, 0],
      ['g3', 'ground', 14, 11, 0],
    ],
    wires: [
      ['v1.0', 'd1.0'],
      ['d1.1', 'c1.0'],
      ['c1.0', 'r1.0'],
      ['v1.1', 'g1.0'],
      ['c1.1', 'g2.0'],
      ['r1.1', 'g3.0'],
    ],
    probes: [
      ['v1.0', 'Vin'],
      ['c1.0', 'Vout'],
    ],
    analysis: { kind: 'transient', tStop: 50e-3, dt: 50e-6 },
  },
  {
    id: 'zener-clipper',
    name: 'Zener clipper / regulator',
    description: 'A 12V sine is clamped at +5.1V by the zener breakdown and at about -0.7V by its forward drop.',
    parts: [
      ['v1', 'vsource_sine', 3, 8, 90, { amplitude: 12, frequency: 60 }],
      ['r1', 'resistor', 8, 7, 0, { resistance: 470 }],
      ['z1', 'zener', 11, 8, 270, { zenerVoltage: 5.1 }],
      ['g1', 'ground', 3, 11, 0],
      ['g2', 'ground', 11, 11, 0],
    ],
    wires: [
      ['v1.0', 'r1.0'],
      ['r1.1', 'z1.1'],
      ['v1.1', 'g1.0'],
      ['z1.0', 'g2.0'],
    ],
    probes: [
      ['v1.0', 'Vin'],
      ['z1.1', 'Vout'],
    ],
    analysis: { kind: 'transient', tStop: 50e-3, dt: 50e-6 },
  },
  {
    id: 'inverting-amplifier',
    name: 'Inverting op-amp amplifier',
    description: 'Gain = -Rf/Rin = -10: a 0.5V, 1kHz input comes out as a 5V inverted sine.',
    parts: [
      ['v1', 'vsource_sine', 2, 9, 90, { amplitude: 0.5, frequency: 1000 }],
      ['rin', 'resistor', 5, 8, 0, { resistance: 1000 }],
      ['rf', 'resistor', 9, 5, 0, { resistance: 10000 }],
      ['u1', 'opamp', 9, 8, 0],
      ['g1', 'ground', 2, 12, 0],
      ['g2', 'ground', 7, 7, 0],
    ],
    wires: [
      ['v1.0', 'rin.0'],
      ['rin.1', 'u1.1'],
      ['rf.0', 'rin.1'],
      ['rf.1', 'u1.2'],
      ['g2.0', 'u1.0'],
      ['v1.1', 'g1.0'],
    ],
    probes: [
      ['v1.0', 'Vin'],
      ['u1.2', 'Vout'],
    ],
    analysis: { kind: 'transient', tStop: 3e-3, dt: 5e-6 },
  },
  {
    id: 'bjt-switch',
    name: 'BJT common-emitter switch',
    description: 'A 5V pulse drives the base through 10k: the transistor saturates and pulls the collector low.',
    parts: [
      ['v1', 'vsource', 12, 6, 90, { voltage: 5 }],
      ['rc', 'resistor', 8, 5, 90, { resistance: 1000 }],
      ['q1', 'bjt_npn', 7, 9, 0],
      ['rb', 'resistor', 4, 9, 0, { resistance: 10000 }],
      ['v2', 'vsource_pulse', 1, 10, 90, { v1: 0, v2: 5, rise: 1e-6, fall: 1e-6, width: 1e-3, period: 2e-3 }],
      ['g1', 'ground', 12, 9, 0],
      ['g2', 'ground', 7, 11, 0],
      ['g3', 'ground', 1, 12, 0],
    ],
    wires: [
      ['rc.0', 'v1.0'],
      ['rc.1', 'q1.1'],
      ['g2.0', 'q1.2'],
      ['v2.0', 'rb.0'],
      ['rb.1', 'q1.0'],
      ['v1.1', 'g1.0'],
      ['v2.1', 'g3.0'],
    ],
    probes: [
      ['v2.0', 'Vbase drive'],
      ['rc.1', 'Vcollector'],
    ],
    analysis: { kind: 'transient', tStop: 4e-3, dt: 10e-6 },
  },
  {
    id: 'transformer',
    name: 'Step-up transformer',
    description: 'An ideal 1:4 transformer turns a 5V/60Hz sine into 20V across a 1k load.',
    parts: [
      ['v1', 'vsource_sine', 3, 8, 90, { amplitude: 5, frequency: 60 }],
      ['t1', 'transformer', 8, 8, 0, { ratio: 4 }],
      ['rl', 'resistor', 12, 8, 90, { resistance: 1000 }],
      ['g1', 'ground', 3, 11, 0],
      ['g2', 'ground', 9, 11, 0],
      ['g3', 'ground', 12, 11, 0],
    ],
    wires: [
      ['v1.0', 't1.0'],
      ['v1.1', 't1.1'],
      ['t1.2', 'rl.0'],
      ['v1.1', 'g1.0'],
      ['t1.3', 'g2.0'],
      ['rl.1', 'g3.0'],
    ],
    probes: [
      ['v1.0', 'Vprimary'],
      ['rl.0', 'Vsecondary'],
    ],
    analysis: { kind: 'transient', tStop: 50e-3, dt: 50e-6 },
  },
];

function resolveTerminal(ids, ref) {
  const [name, index] = ref.split('.');
  return { componentId: ids[name], terminalIndex: Number(index) };
}

// Expands an example into a fresh schematic (new component ids every call, so
// loading the same example twice never aliases) plus resolved probe specs.
export function buildExample(example) {
  const schematic = createSchematic();
  const ids = {};
  for (const [name, type, x, y, rotation, overrides = {}] of example.parts) {
    const defaults = Object.fromEntries(catalog[type].params.map((p) => [p.key, p.default]));
    ids[name] = addComponent(schematic, type, x, y, rotation, { ...defaults, ...overrides });
  }
  for (const [from, to] of example.wires) {
    addWire(schematic, resolveTerminal(ids, from), resolveTerminal(ids, to));
  }
  const probes = example.probes.map(([ref, label]) => ({ ...resolveTerminal(ids, ref), label }));
  return { schematic, probes, ids };
}
