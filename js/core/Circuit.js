// Circuit data model: components plus a union-find over node labels so that
// multiple wire endpoints touching the same electrical point collapse into
// one MNA node. Ground ("0", "gnd", "GND", "ground") always collapses to "0"
// and is excluded from the unknown vector (its voltage is fixed at 0).
import { deviceDefs } from '../components/registry.js';

const GROUND_ALIASES = ['0', 'gnd', 'GND', 'ground'];

export class Circuit {
  constructor() {
    this._parent = new Map();
    this._components = [];
    this._nextId = 0;
    for (const alias of GROUND_ALIASES) this._parent.set(alias, '0');
  }

  _find(label) {
    label = String(label);
    if (!this._parent.has(label)) this._parent.set(label, label);
    let root = label;
    while (this._parent.get(root) !== root) root = this._parent.get(root);
    let cur = label;
    while (this._parent.get(cur) !== root) {
      const next = this._parent.get(cur);
      this._parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  // Merge two node labels into the same electrical node (e.g. two wire
  // endpoints meeting at a junction).
  connect(a, b) {
    const ra = this._find(a);
    const rb = this._find(b);
    if (ra === rb) return;
    if (ra === '0') this._parent.set(rb, '0');
    else if (rb === '0') this._parent.set(ra, '0');
    else this._parent.set(ra, rb);
  }

  addComponent(type, nodeLabels, params = {}) {
    if (!deviceDefs[type]) throw new Error(`Unknown component type: ${type}`);
    const id = `${type}${this._nextId++}`;
    this._components.push({ id, type, nodeLabels: nodeLabels.map(String), params });
    return id;
  }

  // Resolve node labels to MNA matrix indices, assign extra unknowns for
  // devices that need them (voltage sources, later inductors/op-amps), and
  // return everything the solver needs.
  build() {
    const roots = new Set(['0']);
    for (const c of this._components) {
      for (const label of c.nodeLabels) roots.add(this._find(label));
    }

    const nonGroundRoots = [...roots].filter((r) => r !== '0').sort();
    const nodeIndex = new Map();
    nodeIndex.set('0', -1);
    nonGroundRoots.forEach((root, i) => nodeIndex.set(root, i));
    const numNodes = nonGroundRoots.length;

    let extraCount = 0;
    const components = this._components.map((c) => {
      const def = deviceDefs[c.type];
      const nodeIdx = c.nodeLabels.map((label) => nodeIndex.get(this._find(label)));
      const extraIdx = [];
      for (let i = 0; i < (def.numExtraVars || 0); i++) {
        extraIdx.push(numNodes + extraCount++);
      }
      // `memory` is a per-instance scratch object that persists across
      // repeated solves of the SAME built circuit (e.g. every timestep of a
      // transient run), so devices like capacitors/inductors can remember
      // their previous voltage/current for their companion models.
      return { ...c, nodeIdx, extraIdx, def, memory: {} };
    });

    const nodeIndexOf = (label) => nodeIndex.get(this._find(label));

    return {
      numNodes,
      numExtra: extraCount,
      size: numNodes + extraCount,
      components,
      nodeIndexOf,
    };
  }
}
