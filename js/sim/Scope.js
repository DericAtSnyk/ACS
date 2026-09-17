// Renders every probe's value-vs-time trace on its own canvas, with a
// vertical cursor at the current scrub position and a live-value legend.
import { terminalVoltageAt, componentCurrentAt } from './RunTransient.js';

const PROBE_COLORS = ['#5cc8ff', '#ffcf5c', '#7fd88f', '#ff8bcb', '#c9a0ff'];

export function probeColor(index) {
  return PROBE_COLORS[index % PROBE_COLORS.length];
}

function probeSeries(runResult, probe) {
  const n = runResult.times.length;
  const values = new Array(n);
  for (let i = 0; i < n; i++) {
    values[i] =
      probe.kind === 'voltage'
        ? terminalVoltageAt(runResult, i, probe.componentId, probe.terminalIndex)
        : (componentCurrentAt(runResult, i, probe.componentId) ?? 0);
  }
  return values;
}

function drawMessage(ctx, canvas, text) {
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#6a6d78';
  ctx.font = '13px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

export function drawScope(ctx, canvas, state) {
  const { runResult, probes } = state;

  if (!runResult || runResult.kind !== 'transient') {
    drawMessage(ctx, canvas, 'Run a transient simulation to see traces here.');
    return;
  }
  if (probes.length === 0) {
    drawMessage(ctx, canvas, 'No probes placed. Enable "Probe", then click a terminal (voltage) or a component body (current).');
    return;
  }

  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = { left: 52, right: 12, top: 12, bottom: 22 };
  const plotW = canvas.width - margin.left - margin.right;
  const plotH = canvas.height - margin.top - margin.bottom;

  const seriesByProbe = probes.map((p) => probeSeries(runResult, p));
  let minY = Infinity;
  let maxY = -Infinity;
  for (const series of seriesByProbe) {
    for (const v of series) {
      if (v < minY) minY = v;
      if (v > maxY) maxY = v;
    }
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const pad = (maxY - minY) * 0.1;
  minY -= pad;
  maxY += pad;

  const tMax = runResult.times[runResult.times.length - 1] || 1;
  const xAt = (t) => margin.left + (t / tMax) * plotW;
  const yAt = (v) => margin.top + plotH - ((v - minY) / (maxY - minY)) * plotH;

  ctx.strokeStyle = '#3a3d46';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.lineTo(margin.left + plotW, margin.top + plotH);
  ctx.stroke();

  // A dedicated 0 gridline — without it, axis padding can make a curve
  // that's actually sitting flat at 0 look like it dipped below zero,
  // since the visual bottom of the chart is minY, not 0.
  if (minY < 0 && maxY > 0) {
    const zeroY = yAt(0);
    ctx.strokeStyle = '#4a4d56';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(margin.left, zeroY);
    ctx.lineTo(margin.left + plotW, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#6a6d78';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', margin.left - 4, zeroY);
  }

  ctx.fillStyle = '#9a9aa5';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(maxY.toFixed(2), margin.left - 4, margin.top);
  ctx.fillText(minY.toFixed(2), margin.left - 4, margin.top + plotH);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('0', margin.left, margin.top + plotH + 4);
  ctx.fillText(`${(tMax * 1000).toFixed(2)} ms`, margin.left + plotW, margin.top + plotH + 4);

  probes.forEach((probe, idx) => {
    const series = seriesByProbe[idx];
    ctx.strokeStyle = probeColor(idx);
    ctx.lineWidth = 2;
    ctx.beginPath();
    runResult.times.forEach((t, i) => {
      const x = xAt(t);
      const y = yAt(series[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  const scrubIdx = Math.max(0, Math.min(runResult.times.length - 1, Math.floor(state.scrubIndex)));
  const cursorX = xAt(runResult.times[scrubIdx]);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(cursorX, margin.top);
  ctx.lineTo(cursorX, margin.top + plotH);
  ctx.stroke();

  let legendY = margin.top + 10;
  probes.forEach((probe, idx) => {
    const value = seriesByProbe[idx][scrubIdx];
    const unit = probe.kind === 'voltage' ? 'V' : 'A';
    ctx.fillStyle = probeColor(idx);
    ctx.fillRect(margin.left + 6, legendY - 5, 8, 8);
    ctx.fillStyle = '#e8e8ea';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '11px system-ui';
    ctx.fillText(`${probe.label}: ${value.toFixed(4)} ${unit}`, margin.left + 20, legendY);
    legendY += 14;
  });
}
