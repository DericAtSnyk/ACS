// Time-varying (sinusoidal) voltage source, for transient analysis only —
// under a plain DC operating point (no `t`/`dt` supplied) it evaluates at
// t=0, same as any other stamp.
import { stampVSource } from './_vsourceCommon.js';

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
};
