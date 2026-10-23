// Periodic trapezoidal pulse voltage source (square wave when rise/fall are
// ~0), for transient analysis: v1 until `delay`, ramps to v2 over `rise`,
// holds for `width`, ramps back over `fall`, then repeats every `period`.
// Like the sine source it has no AC component — it acts as an AC short.
import { stampVSource, stampVSourceAc } from './_vsourceCommon.js';

export function pulseValue(params, t = 0) {
  const { v1 = 0, v2 = 5, delay = 0, rise = 0, fall = 0, width = 0.5e-3, period = 1e-3 } = params;
  if (t < delay) return v1;
  const tt = period > 0 ? (t - delay) % period : t - delay;
  if (tt < rise) return v1 + ((v2 - v1) * tt) / rise;
  if (tt < rise + width) return v2;
  if (tt < rise + width + fall) return v2 + ((v1 - v2) * (tt - rise - width)) / fall;
  return v1;
}

export default {
  type: 'vsource_pulse',
  numExtraVars: 1,
  stamp(ctx) {
    stampVSource(ctx, (c) => pulseValue(c.params, c.t || 0));
  },
  stampAc(ctx) {
    stampVSourceAc(ctx, () => ({ re: 0, im: 0 }));
  },
};
