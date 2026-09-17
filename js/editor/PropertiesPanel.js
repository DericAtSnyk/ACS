// Editable form for the selected component's parameters, plus rotate/delete.
import { rotateComponent, removeComponent } from './Schematic.js';

export function renderProperties(container, state, catalog, onChange) {
  container.innerHTML = '';
  const sel = state.selection;

  if (!sel || sel.kind !== 'component') {
    const p = document.createElement('p');
    p.className = 'props-empty';
    p.textContent = 'Select a component to edit its properties.';
    container.appendChild(p);
    return;
  }

  const comp = state.schematic.components.find((c) => c.id === sel.id);
  if (!comp) return;
  const def = catalog[comp.type];

  const title = document.createElement('h3');
  title.textContent = def.label;
  container.appendChild(title);

  const idLine = document.createElement('p');
  idLine.className = 'props-id';
  idLine.textContent = comp.id;
  container.appendChild(idLine);

  if (def.params.length === 0) {
    const p = document.createElement('p');
    p.className = 'props-empty';
    p.textContent = 'No editable parameters.';
    container.appendChild(p);
  }

  for (const paramDef of def.params) {
    const row = document.createElement('label');
    row.className = 'prop-row';
    row.textContent = `${paramDef.label} (${paramDef.unit})`;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.value = comp.params[paramDef.key];
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (!Number.isNaN(v)) {
        comp.params[paramDef.key] = v;
        onChange();
      }
    });
    row.appendChild(input);
    container.appendChild(row);
  }

  const actions = document.createElement('div');
  actions.className = 'props-actions';

  const rotateBtn = document.createElement('button');
  rotateBtn.textContent = 'Rotate 90°';
  rotateBtn.addEventListener('click', () => {
    rotateComponent(state.schematic, comp.id);
    onChange();
  });
  actions.appendChild(rotateBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'danger';
  deleteBtn.addEventListener('click', () => {
    removeComponent(state.schematic, comp.id);
    state.selection = null;
    onChange();
  });
  actions.appendChild(deleteBtn);

  container.appendChild(actions);
}
