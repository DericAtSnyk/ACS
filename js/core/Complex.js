// Minimal complex-number arithmetic on plain {re, im} objects, used by the
// AC small-signal solver (js/core/ComplexLinAlg.js, js/core/AC.js) and the
// device stampAc()s. Kept separate from js/core/LinAlg.js, which stays
// purely real-valued for the DC/transient path.
export function complex(re = 0, im = 0) {
  return { re, im };
}

// Builds a phasor from a magnitude and phase in degrees — how an AC source's
// amplitude/phaseDeg params become a complex stimulus.
export function polar(magnitude, phaseDeg = 0) {
  const rad = (phaseDeg * Math.PI) / 180;
  return { re: magnitude * Math.cos(rad), im: magnitude * Math.sin(rad) };
}

export function add(a, b) {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function sub(a, b) {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function mul(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

export function div(a, b) {
  const denom = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / denom, im: (a.im * b.re - a.re * b.im) / denom };
}

export function mag(z) {
  return Math.hypot(z.re, z.im);
}

export function phaseDeg(z) {
  return (Math.atan2(z.im, z.re) * 180) / Math.PI;
}
