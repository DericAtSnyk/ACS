// UI-facing metadata for each component type: how it looks, where its
// terminals are, and what a user can edit. Separate from
// js/components/registry.js, which only knows about the solver's MNA stamp
// functions — "ground" lives here but has no stamp (js/sim/RunDC.js special-
// cases it as a connection to node "0" instead of a device).
import { GRID_SIZE } from '../editor/Geometry.js';

const RESISTOR_ZIGZAG = [
  [-0.6, 0],
  [-0.45, -0.35],
  [-0.3, 0.35],
  [-0.15, -0.35],
  [0, 0.35],
  [0.15, -0.35],
  [0.3, 0.35],
  [0.45, -0.35],
  [0.6, 0],
];

export const catalog = {
  resistor: {
    label: 'Resistor',
    terminals: [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ],
    bodyExtentGrid: { minX: -1, maxX: 1, minY: -0.4, maxY: 0.4 },
    params: [{ key: 'resistance', label: 'Resistance', unit: 'Ω', default: 1000, min: 0.01 }],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-g, 0);
      for (const [x, y] of RESISTOR_ZIGZAG) ctx.lineTo(x * g, y * g);
      ctx.lineTo(g, 0);
      ctx.stroke();
    },
  },

  vsource: {
    label: 'DC Voltage Source',
    terminals: [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ],
    bodyExtentGrid: { minX: -1, maxX: 1, minY: -0.5, maxY: 0.5 },
    params: [{ key: 'voltage', label: 'Voltage', unit: 'V', default: 5, min: -1e6 }],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-g, 0);
      ctx.lineTo(-0.5 * g, 0);
      ctx.moveTo(0.5 * g, 0);
      ctx.lineTo(g, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 0.5 * g, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = `${0.45 * g}px system-ui`;
      ctx.fillStyle = '#e8e8ea';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', -0.22 * g, 0);
      ctx.fillText('−', 0.22 * g, 0);
    },
  },

  isource: {
    label: 'DC Current Source',
    terminals: [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ],
    bodyExtentGrid: { minX: -1, maxX: 1, minY: -0.5, maxY: 0.5 },
    params: [{ key: 'current', label: 'Current', unit: 'A', default: 0.01, min: -1e6 }],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-g, 0);
      ctx.lineTo(-0.5 * g, 0);
      ctx.moveTo(0.5 * g, 0);
      ctx.lineTo(g, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 0.5 * g, 0, Math.PI * 2);
      ctx.stroke();
      // Arrow points from the "from" terminal (left) to the "to" terminal
      // (right), matching the isource stamp's current-direction convention.
      ctx.beginPath();
      ctx.moveTo(-0.3 * g, 0);
      ctx.lineTo(0.25 * g, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.3 * g, 0);
      ctx.lineTo(0.15 * g, -0.12 * g);
      ctx.lineTo(0.15 * g, 0.12 * g);
      ctx.closePath();
      ctx.fillStyle = '#e8e8ea';
      ctx.fill();
    },
  },

  capacitor: {
    label: 'Capacitor',
    terminals: [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ],
    bodyExtentGrid: { minX: -1, maxX: 1, minY: -0.5, maxY: 0.5 },
    params: [{ key: 'capacitance', label: 'Capacitance', unit: 'F', default: 1e-6, min: 1e-15 }],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-g, 0);
      ctx.lineTo(-0.15 * g, 0);
      ctx.moveTo(0.15 * g, 0);
      ctx.lineTo(g, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.15 * g, -0.45 * g);
      ctx.lineTo(-0.15 * g, 0.45 * g);
      ctx.moveTo(0.15 * g, -0.45 * g);
      ctx.lineTo(0.15 * g, 0.45 * g);
      ctx.stroke();
    },
  },

  inductor: {
    label: 'Inductor',
    terminals: [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ],
    bodyExtentGrid: { minX: -1, maxX: 1, minY: -0.35, maxY: 0.35 },
    params: [{ key: 'inductance', label: 'Inductance', unit: 'H', default: 1e-3, min: 1e-12 }],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-g, 0);
      ctx.lineTo(-0.6 * g, 0);
      ctx.moveTo(0.6 * g, 0);
      ctx.lineTo(g, 0);
      ctx.stroke();
      const humps = 4;
      const start = -0.6;
      const step = 1.2 / humps;
      ctx.beginPath();
      for (let i = 0; i < humps; i++) {
        const cx = (start + step * (i + 0.5)) * g;
        ctx.moveTo(cx - (step / 2) * g, 0);
        ctx.arc(cx, 0, (step / 2) * g, Math.PI, 0, true);
      }
      ctx.stroke();
    },
  },

  vsource_sine: {
    label: 'AC Voltage Source',
    terminals: [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ],
    bodyExtentGrid: { minX: -1, maxX: 1, minY: -0.5, maxY: 0.5 },
    params: [
      { key: 'amplitude', label: 'Amplitude', unit: 'V', default: 5, min: 0 },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', default: 60, min: 0.001 },
      { key: 'phaseDeg', label: 'Phase', unit: '°', default: 0, min: -360 },
      { key: 'offset', label: 'Offset', unit: 'V', default: 0, min: -1e6 },
    ],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-g, 0);
      ctx.lineTo(-0.5 * g, 0);
      ctx.moveTo(0.5 * g, 0);
      ctx.lineTo(g, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 0.5 * g, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      const w = 0.35 * g;
      for (let i = 0; i <= 16; i++) {
        const frac = i / 16;
        const x = -w + frac * 2 * w;
        const y = -0.2 * g * Math.sin(frac * 2 * Math.PI);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    },
  },

  diode: {
    label: 'Diode',
    terminals: [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ],
    bodyExtentGrid: { minX: -1, maxX: 1, minY: -0.35, maxY: 0.35 },
    params: [
      { key: 'saturationCurrent', label: 'Sat. Current (Is)', unit: 'A', default: 1e-14, min: 1e-18 },
      { key: 'n', label: 'Ideality (n)', unit: '', default: 1, min: 0.5 },
    ],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-g, 0);
      ctx.lineTo(-0.3 * g, 0);
      ctx.moveTo(0.3 * g, 0);
      ctx.lineTo(g, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.3 * g, -0.3 * g);
      ctx.lineTo(-0.3 * g, 0.3 * g);
      ctx.lineTo(0.3 * g, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.3 * g, -0.3 * g);
      ctx.lineTo(0.3 * g, 0.3 * g);
      ctx.stroke();
    },
  },

  switch: {
    label: 'Switch',
    terminals: [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ],
    bodyExtentGrid: { minX: -1, maxX: 1, minY: -0.45, maxY: 0.1 },
    params: [{ key: 'closeTime', label: 'Close at', unit: 's', default: 0, min: 0 }],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-g, 0);
      ctx.lineTo(-0.55 * g, 0);
      ctx.moveTo(0.55 * g, 0);
      ctx.lineTo(g, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.5 * g, 0);
      ctx.lineTo(0.45 * g, -0.4 * g);
      ctx.stroke();
      ctx.fillStyle = '#e8e8ea';
      for (const cx of [-0.5, 0.5]) {
        ctx.beginPath();
        ctx.arc(cx * g, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },

  opamp: {
    label: 'Op-Amp (ideal)',
    terminals: [
      { x: -1, y: -0.4 },
      { x: -1, y: 0.4 },
      { x: 1, y: 0 },
    ],
    bodyExtentGrid: { minX: -1, maxX: 1, minY: -0.6, maxY: 0.6 },
    params: [],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-1 * g, -0.6 * g);
      ctx.lineTo(-1 * g, 0.6 * g);
      ctx.lineTo(1 * g, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.font = `${0.32 * g}px system-ui`;
      ctx.fillStyle = '#e8e8ea';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', -0.92 * g, -0.35 * g);
      ctx.fillText('−', -0.92 * g, 0.35 * g);
    },
  },

  bjt_npn: {
    label: 'BJT (NPN)',
    terminals: [
      { x: -1, y: 0 }, // base
      { x: 0.3, y: -0.7 }, // collector
      { x: 0.3, y: 0.7 }, // emitter
    ],
    bodyExtentGrid: { minX: -1, maxX: 0.5, minY: -0.7, maxY: 0.7 },
    params: [
      { key: 'saturationCurrent', label: 'Sat. Current (Is)', unit: 'A', default: 1e-15, min: 1e-18 },
      { key: 'betaF', label: 'β forward', unit: '', default: 100, min: 1 },
      { key: 'betaR', label: 'β reverse', unit: '', default: 1, min: 0.1 },
    ],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-1 * g, 0);
      ctx.lineTo(-0.3 * g, 0);
      ctx.moveTo(-0.3 * g, -0.5 * g);
      ctx.lineTo(-0.3 * g, 0.5 * g);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.3 * g, -0.3 * g);
      ctx.lineTo(0.3 * g, -0.7 * g);
      ctx.moveTo(-0.3 * g, 0.3 * g);
      ctx.lineTo(0.3 * g, 0.7 * g);
      ctx.stroke();
      // Emitter arrow (NPN: points away from the base, out of the device).
      const ex = 0.3 * g;
      const ey = 0.7 * g;
      const ang = Math.atan2(ey - 0.3 * g, ex - -0.3 * g);
      ctx.beginPath();
      ctx.moveTo(0.02 * g, 0.32 * g);
      ctx.lineTo(0.02 * g + 6 * Math.cos(ang - 0.5), 0.32 * g + 6 * Math.sin(ang - 0.5));
      ctx.lineTo(0.02 * g + 6 * Math.cos(ang + 0.5), 0.32 * g + 6 * Math.sin(ang + 0.5));
      ctx.closePath();
      ctx.fillStyle = '#e8e8ea';
      ctx.fill();
    },
  },

  nmos: {
    label: 'NMOS',
    terminals: [
      { x: -1, y: 0 }, // gate
      { x: 0.3, y: -0.7 }, // drain
      { x: 0.3, y: 0.7 }, // source
    ],
    bodyExtentGrid: { minX: -1, maxX: 0.5, minY: -0.7, maxY: 0.7 },
    params: [
      { key: 'thresholdVoltage', label: 'Threshold (Vt)', unit: 'V', default: 2, min: -20 },
      { key: 'transconductance', label: 'Transconductance (k)', unit: 'A/V²', default: 1e-3, min: 1e-9 },
    ],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-1 * g, 0);
      ctx.lineTo(-0.4 * g, 0);
      ctx.moveTo(-0.4 * g, -0.35 * g);
      ctx.lineTo(-0.4 * g, 0.35 * g);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.2 * g, -0.5 * g);
      ctx.lineTo(-0.2 * g, 0.5 * g);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.2 * g, -0.5 * g);
      ctx.lineTo(0.3 * g, -0.5 * g);
      ctx.lineTo(0.3 * g, -0.7 * g);
      ctx.moveTo(-0.2 * g, 0.5 * g);
      ctx.lineTo(0.3 * g, 0.5 * g);
      ctx.lineTo(0.3 * g, 0.7 * g);
      ctx.stroke();
    },
  },

  ground: {
    label: 'Ground',
    terminals: [{ x: 0, y: 0 }],
    bodyExtentGrid: { minX: -0.5, maxX: 0.5, minY: 0, maxY: 0.55 },
    params: [],
    draw(ctx) {
      const g = GRID_SIZE;
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 0.3 * g);
      ctx.stroke();
      const bars = [
        [0.5, 0.3],
        [0.32, 0.42],
        [0.16, 0.54],
      ];
      for (const [w, y] of bars) {
        ctx.beginPath();
        ctx.moveTo(-w * g, y * g);
        ctx.lineTo(w * g, y * g);
        ctx.stroke();
      }
    },
  },
};
