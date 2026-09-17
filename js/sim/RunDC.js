// Bridges the editor's schematic model to the solver's Circuit/MNA model and
// runs a single DC operating point. Phase C will add a time-stepping variant
// of buildCircuitFromSchematic's output for transient analysis.
import { Circuit } from '../core/Circuit.js';
import { solveLinearDC, nodeVoltage, branchCurrent } from '../core/Solver.js';

function terminalKey(componentId, terminalIndex) {
  return `${componentId}#${terminalIndex}`;
}

export function buildCircuitFromSchematic(schematic, catalog) {
  const circuit = new Circuit();

  for (const wire of schematic.wires) {
    circuit.connect(
      terminalKey(wire.from.componentId, wire.from.terminalIndex),
      terminalKey(wire.to.componentId, wire.to.terminalIndex)
    );
  }

  for (const comp of schematic.components) {
    if (comp.type === 'ground') {
      circuit.connect(terminalKey(comp.id, 0), '0');
      continue;
    }
    const def = catalog[comp.type];
    const nodeLabels = def.terminals.map((_, i) => terminalKey(comp.id, i));
    circuit.addComponent(comp.type, nodeLabels, comp.params);
  }

  return circuit;
}

export function runDC(schematic, catalog) {
  const circuit = buildCircuitFromSchematic(schematic, catalog);
  const built = circuit.build();
  const result = solveLinearDC(built);
  return { built, result };
}

export function terminalVoltage(runResult, componentId, terminalIndex) {
  return nodeVoltage(runResult.built, runResult.result, terminalKey(componentId, terminalIndex));
}

export function componentBranchCurrent(runResult, componentId) {
  return branchCurrent(runResult.built, runResult.result, componentId);
}
