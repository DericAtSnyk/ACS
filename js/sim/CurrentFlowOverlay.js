// Visual encoding of current on a wire: thicker + brighter for larger
// |current|, plus a small arrow marker showing direction. Purely a drawing
// helper — CanvasRenderer.js decides which current value applies to a wire.
const MAX_EXTRA_WIDTH = 5;
const REFERENCE_CURRENT = 0.05; // amps at which the line reaches near-max emphasis

function currentIntensity(current) {
  return Math.min(1, Math.abs(current) / REFERENCE_CURRENT);
}

export function drawCurrentFlow(ctx, route, current) {
  const intensity = currentIntensity(current);
  if (intensity < 0.02) return;

  const width = 1.5 + intensity * MAX_EXTRA_WIDTH;
  const alpha = 0.35 + 0.65 * intensity;

  ctx.strokeStyle = `rgba(255, 200, 90, ${alpha.toFixed(2)})`;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(route[0].x, route[0].y);
  for (let i = 1; i < route.length; i++) ctx.lineTo(route[i].x, route[i].y);
  ctx.stroke();

  const forward = current >= 0;
  const a = route[route.length - 2];
  const b = route[route.length - 1];
  const dir = forward ? { x: b.x - a.x, y: b.y - a.y } : { x: a.x - b.x, y: a.y - b.y };
  const len = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / len;
  const uy = dir.y / len;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const size = 5 + intensity * 4;

  ctx.fillStyle = `rgba(255, 200, 90, ${Math.min(1, alpha + 0.2).toFixed(2)})`;
  ctx.beginPath();
  ctx.moveTo(mx + ux * size, my + uy * size);
  ctx.lineTo(mx - uy * size * 0.5, my + ux * size * 0.5);
  ctx.lineTo(mx + uy * size * 0.5, my - ux * size * 0.5);
  ctx.closePath();
  ctx.fill();
}
