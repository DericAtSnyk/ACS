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
};
