// Independent DC voltage source.
//
// Reference direction: the branch current is defined flowing from the "+" node,
// through the source, to the "-" node. A negative result means current actually
// flows out of the "+" terminal into the external circuit, as expected for a
// source delivering power to a load.
import { stampVSource, stampVSourceAc } from './_vsourceCommon.js';

export default {
  type: 'vsource',
  numExtraVars: 1,
  stamp(ctx) {
    stampVSource(ctx, (c) => c.params.voltage);
  },
  // A fixed DC source has no AC component — it's an ideal short at signal
  // frequency (the standard assumption when no separate AC spec is given).
  stampAc(ctx) {
    stampVSourceAc(ctx, () => ({ re: 0, im: 0 }));
  },
};
