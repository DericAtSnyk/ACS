// Explicit JSON export/import of the schematic (per the user's chosen
// persistence approach — no auto-save).
export function exportSchematicToFile(schematic, filename = 'circuit.json') {
  const data = JSON.stringify(schematic, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importSchematicFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.components) || !Array.isArray(data.wires)) {
          throw new Error('Invalid schematic file: missing components/wires arrays');
        }
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
