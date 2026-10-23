// Voltage-controlled current source (transconductance): a current of
// gm * (V(ctrl+) - V(ctrl-)) flows from out+, through the device, to out-.
// Terminals: [out+, out-, ctrl+, ctrl-]. Needs no extra MNA unknown.
import { stampVCCS, stampVCCSAc } from './_nonlinearCommon.js';

export default {
  type: 'vccs',
  numExtraVars: 0,
  stamp({ G, b, n, params }) {
    const [op, om, cp, cm] = n;
    stampVCCS(G, b, [op, om], [cp, cm], params.transconductance, 0);
  },
  currentAt({ x, n, params }) {
    const [, , cp, cm] = n;
    return params.transconductance * ((cp >= 0 ? x[cp] : 0) - (cm >= 0 ? x[cm] : 0));
  },
  stampAc({ G, n, params }) {
    const [op, om, cp, cm] = n;
    stampVCCSAc(G, [op, om], [cp, cm], params.transconductance);
  },
};
