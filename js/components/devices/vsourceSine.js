// Time-varying (sinusoidal) voltage source, for transient analysis only —
// under a plain DC operating point (no `t`/`dt` supplied) it evaluates at
// t=0, same as any other stamp.
import { stampVSource, stampVSourceAc } from './_vsourceCommon.js';
import { polar } from '../../core/Complex.js';

export default {
  type: 'vsource_sine',
  numExtraVars: 1,
  stamp(ctx) {
    stampVSource(ctx, (c) => {
      const { amplitude, frequency, phaseDeg = 0, offset = 0 } = c.params;
      const t = c.t || 0;
      return offset + amplitude * Math.sin(2 * Math.PI * frequency * t + (phaseDeg * Math.PI) / 180);
    });
  },
  // This is the AC sweep's stimulus: amplitude/phaseDeg become the phasor
  // directly. frequency/offset are ignored here — the sweep's own frequency
  // (via ctx.omega) drives every device, and AC analysis has no DC offset.
  stampAc(ctx) {
    stampVSourceAc(ctx, (c) => polar(c.params.amplitude, c.params.phaseDeg ?? 0));
  },
};
