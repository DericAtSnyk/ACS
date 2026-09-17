// Assembles the MNA matrix from a built circuit and solves it — via
// Newton-Raphson fixed-point iteration, since nonlinear devices (diode, BJT,
// MOSFET) re-linearize around the current voltage guess on every iteration.
// Purely linear circuits still go through this loop, they just converge on
// the second iteration (the matrix doesn't depend on the guess at all).
import { solve } from './LinAlg.js';

const DEFAULT_MAX_ITERATIONS = 150;
const DEFAULT_TOLERANCE = 1e-9;

export function solveMNA(built, { t = 0, dt, x0, maxIterations = DEFAULT_MAX_ITERATIONS, tolerance = DEFAULT_TOLERANCE } = {}) {
  const { size, components } = built;
  let x = x0 ? x0.slice() : new Array(size).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    const G = Array.from({ length: size }, () => new Array(size).fill(0));
    const b = new Array(size).fill(0);

    for (const c of components) {
      c.def.stamp({ G, b, n: c.nodeIdx, extra: c.extraIdx, params: c.params, memory: c.memory, t, dt, x });
    }

    const xNew = solve(G, b);
    const converged = maxAbsDiff(xNew, x) < tolerance;
    x = xNew;
    if (converged) return { x, iterations: iter + 1 };
  }

  throw new Error(
    `Newton-Raphson did not converge within ${maxIterations} iterations — the circuit may be unstable or ill-posed (e.g. a nonlinear device with too little series resistance).`
  );
}

function maxAbsDiff(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > m) m = d;
  }
  return m;
}

// DC operating point: no `dt`, so capacitors/inductors fall back to their
// steady-state approximations (open / near-short — see their stamp()s).
export function solveLinearDC(built) {
  return solveMNA(built, {});
}

export function nodeVoltage(built, result, label) {
  const idx = built.nodeIndexOf(label);
  if (idx === undefined || idx === -1) return 0;
  return result.x[idx];
}

export function branchCurrent(built, result, componentId) {
  const c = built.components.find((comp) => comp.id === componentId);
  if (!c || c.extraIdx.length === 0) {
    throw new Error(`Component ${componentId} has no branch-current unknown`);
  }
  return result.x[c.extraIdx[0]];
}

// A component's current at an already-solved step, for any device type that
// can determine it from that single solve: either it has its own MNA branch
// current (voltage sources, op-amp output), or it exposes a currentAt()
// derived from node voltages (resistor, current source, diode, switch, BJT,
// MOSFET). Capacitors/inductors are history-dependent and are NOT resolvable
// this way — js/sim/RunTransient.js tracks their current separately.
export function resolvedCurrent(component, x, t = 0) {
  if (component.extraIdx.length > 0) return x[component.extraIdx[0]];
  if (component.def.currentAt) {
    return component.def.currentAt({ x, n: component.nodeIdx, params: component.params, t });
  }
  return undefined;
}
