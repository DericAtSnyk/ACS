// Renders every voltage probe's magnitude (dB) and phase (deg) vs frequency
// as two stacked plots sharing a log-scale frequency axis — a Bode plot.
// Mirrors Scope.js's structure/style, but the whole sweep is static (no
// scrub cursor) and only voltage probes are supported for now.
import { terminalPhasorAt, magnitudeDb, phaseDeg } from './RunAC.js';
import { probeColor } from './Scope.js';

function drawMessage(ctx, canvas, text) {
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#6a6d78';
  ctx.font = '13px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function probeSeries(runResult, probe) {
  const n = runResult.freqs.length;
  const magsDb = new Array(n);
  const phasesDeg = new Array(n);
  for (let i = 0; i < n; i++) {
    const z = terminalPhasorAt(runResult, i, probe.componentId, probe.terminalIndex);
    magsDb[i] = magnitudeDb(z);
    phasesDeg[i] = phaseDeg(z);
  }
  return { magsDb, phasesDeg };
}

function plotSeries(ctx, { x0, y0, w, h }, freqs, values, colorOf, label) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const series of values) {
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

  const logMin = Math.log10(freqs[0]);
  const logMax = Math.log10(freqs[freqs.length - 1]);
  const xAt = (f) => x0 + ((Math.log10(f) - logMin) / (logMax - logMin || 1)) * w;
  const yAt = (v) => y0 + h - ((v - minY) / (maxY - minY)) * h;

  ctx.strokeStyle = '#3a3d46';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, y0 + h);
  ctx.lineTo(x0 + w, y0 + h);
  ctx.stroke();

  ctx.fillStyle = '#9a9aa5';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${maxY.toFixed(1)} ${label}`, x0 - 4, y0);
  ctx.fillText(`${minY.toFixed(1)} ${label}`, x0 - 4, y0 + h);

  values.forEach((series, idx) => {
    ctx.strokeStyle = colorOf(idx);
    ctx.lineWidth = 2;
    ctx.beginPath();
    freqs.forEach((f, i) => {
      const x = xAt(f);
      const y = yAt(series[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function formatHz(f) {
  if (f >= 1e6) return `${(f / 1e6).toFixed(f % 1e6 === 0 ? 0 : 2)} MHz`;
  if (f >= 1e3) return `${(f / 1e3).toFixed(f % 1e3 === 0 ? 0 : 2)} kHz`;
  return `${f.toFixed(f % 1 === 0 ? 0 : 2)} Hz`;
}

export function drawBode(ctx, canvas, state) {
  const { runResult, probes } = state;

  if (!runResult || runResult.kind !== 'ac') {
    drawMessage(ctx, canvas, 'Run an AC sweep to see a Bode plot here.');
    return;
  }
  const voltageProbes = probes.filter((p) => p.kind === 'voltage');
  if (voltageProbes.length === 0) {
    drawMessage(
      ctx,
      canvas,
      'No voltage probes placed. Enable "Probe", then click a terminal to watch its gain/phase.'
    );
    return;
  }

  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = { left: 56, right: 12, top: 12, bottom: 22 };
  const gap = 18;
  const plotW = canvas.width - margin.left - margin.right;
  const totalPlotH = canvas.height - margin.top - margin.bottom - gap;
  const magH = Math.round(totalPlotH * 0.55);
  const phaseH = totalPlotH - magH;
  const magY0 = margin.top;
  const phaseY0 = margin.top + magH + gap;

  const series = voltageProbes.map((p) => probeSeries(runResult, p));
  const colorOf = (idx) => probeColor(idx);

  plotSeries(
    ctx,
    { x0: margin.left, y0: magY0, w: plotW, h: magH },
    runResult.freqs,
    series.map((s) => s.magsDb),
    colorOf,
    'dB'
  );
  plotSeries(
    ctx,
    { x0: margin.left, y0: phaseY0, w: plotW, h: phaseH },
    runResult.freqs,
    series.map((s) => s.phasesDeg),
    colorOf,
    '°'
  );

  ctx.fillStyle = '#9a9aa5';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(formatHz(runResult.freqs[0]), margin.left, phaseY0 + phaseH + 4);
  ctx.textAlign = 'right';
  ctx.fillText(formatHz(runResult.freqs[runResult.freqs.length - 1]), margin.left + plotW, phaseY0 + phaseH + 4);

  let legendY = magY0 + 10;
  voltageProbes.forEach((probe, idx) => {
    ctx.fillStyle = colorOf(idx);
    ctx.fillRect(margin.left + 6, legendY - 5, 8, 8);
    ctx.fillStyle = '#e8e8ea';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '11px system-ui';
    ctx.fillText(probe.label, margin.left + 20, legendY);
    legendY += 14;
  });
}
