// Registry of component types available to the circuit builder.
// Each entry is a device definition: { type, numExtraVars, stamp(ctx) }.
import resistor from './devices/resistor.js';
import vsource from './devices/vsource.js';
import vsourceSine from './devices/vsourceSine.js';
import isource from './devices/isource.js';
import capacitor from './devices/capacitor.js';
import inductor from './devices/inductor.js';
import diode from './devices/diode.js';
import toggleSwitch from './devices/switch.js';
import opamp from './devices/opamp.js';
import bjt from './devices/bjt.js';
import mosfet from './devices/mosfet.js';
import vsourcePulse from './devices/vsourcePulse.js';
import zener from './devices/zener.js';
import vcvs from './devices/vcvs.js';
import vccs from './devices/vccs.js';
import transformer from './devices/transformer.js';

export const deviceDefs = {
  resistor,
  vsource,
  vsource_sine: vsourceSine,
  isource,
  capacitor,
  inductor,
  diode,
  switch: toggleSwitch,
  opamp,
  bjt_npn: bjt,
  nmos: mosfet,
  vsource_pulse: vsourcePulse,
  zener,
  vcvs,
  vccs,
  transformer,
};
