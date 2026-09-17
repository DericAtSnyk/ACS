// Ideal op-amp as a "nullor": a nullator (V+ = V-, zero input current) at
// the input pair, plus a norator (arbitrary V/I) at the output. This is
// exactly linear — no open-loop gain/saturation modeled — so it needs no
// Newton-Raphson, just one extra MNA unknown for the output current needed
// to enforce V+ = V-. Terminals: [in+, in-, out].
export default {
  type: 'opamp',
  numExtraVars: 1,
  stamp({ G, n, extra }) {
    const [plus, minus, out] = n;
    const [k] = extra;
    if (plus >= 0) G[k][plus] += 1;
    if (minus >= 0) G[k][minus] -= 1;
    if (out >= 0) G[out][k] += 1;
  },
};
