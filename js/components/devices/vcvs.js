// Voltage-controlled voltage source: V(out+) - V(out-) = gain * (V(ctrl+) -
// V(ctrl-)). Terminals: [out+, out-, ctrl+, ctrl-]. One extra MNA unknown for
// the output branch current (flowing out+ -> out- through the source).
export default {
  type: 'vcvs',
  numExtraVars: 1,
  stamp({ G, n, extra, params }) {
    const [op, om, cp, cm] = n;
    const [k] = extra;
    const gain = params.gain;
    if (op >= 0) {
      G[op][k] += 1;
      G[k][op] += 1;
    }
    if (om >= 0) {
      G[om][k] -= 1;
      G[k][om] -= 1;
    }
    if (cp >= 0) G[k][cp] -= gain;
    if (cm >= 0) G[k][cm] += gain;
  },
  stampAc({ G, n, extra, params }) {
    const [op, om, cp, cm] = n;
    const [k] = extra;
    const gain = params.gain;
    if (op >= 0) {
      G[op][k].re += 1;
      G[k][op].re += 1;
    }
    if (om >= 0) {
      G[om][k].re -= 1;
      G[k][om].re -= 1;
    }
    if (cp >= 0) G[k][cp].re -= gain;
    if (cm >= 0) G[k][cm].re += gain;
  },
};
