// Native HTML5 drag-and-drop from the palette onto the schematic canvas.
import { pixelToGrid, snapToGrid } from './Geometry.js';

export function setupDragDrop(canvas, state, catalog, schematicOps, originPx, onChange) {
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/component-type');
    const def = catalog[type];
    if (!def) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const grid = pixelToGrid(px, py, originPx);
    const snapped = snapToGrid(grid.x, grid.y);

    const params = Object.fromEntries(def.params.map((p) => [p.key, p.default]));
    schematicOps.addComponent(state.schematic, type, snapped.x, snapped.y, 0, params);
    onChange();
  });
}
