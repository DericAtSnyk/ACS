// Renders the draggable list of component types.
export function renderPalette(container, catalog) {
  container.innerHTML = '';
  for (const [type, def] of Object.entries(catalog)) {
    const item = document.createElement('div');
    item.className = 'palette-item';
    item.draggable = true;
    item.textContent = def.label;
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/component-type', type);
      e.dataTransfer.effectAllowed = 'copy';
    });
    container.appendChild(item);
  }
}
