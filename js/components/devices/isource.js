// Independent DC current source. No extra MNA unknown needed — it only
// injects current into the right-hand side vector.
//
// nodeLabels = [from, to]: current flows from "from", through the source,
// into "to" (i.e. it is injected into node "to" and drawn out of "from").
export default {
  type: 'isource',
  numExtraVars: 0,
  stamp({ b, n, params }) {
    const [from, to] = n;
    const I = params.current;
    if (to >= 0) b[to] += I;
    if (from >= 0) b[from] -= I;
  },
  currentAt({ params }) {
    return params.current;
  },
  // A fixed DC current source has no AC component — it's an ideal open at
  // signal frequency (mirrors vsource's AC-short assumption).
  stampAc() {},
};
