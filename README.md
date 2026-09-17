# Analog Circuit Simulator

A local, browser-based schematic editor and analog circuit simulator —
drag components onto a grid, wire them up, and run a DC operating point or a
full transient simulation with an oscilloscope panel. Inspired by classic
tools like PSpice, built from scratch as a learning project.

Everything runs client-side in the browser. Node is only used to serve the
static files — there are no npm dependencies at all.

## Running it

```bash
npm start
```

Then open **http://localhost:8000**.

To run the solver's test suite (checks the math against known analytical
results — voltage dividers, RC/RL transients, diode rectifier, op-amp gain,
BJT/MOSFET switching):

```bash
npm test
```

## Using the editor

- **Place a component**: drag it from the palette onto the grid.
- **Wire two components**: click a terminal (blue dot) to start a wire,
  click another terminal to finish it.
- **Select / move**: click a component's body, then drag.
- **Rotate / delete**: select a component, press `R` to rotate or
  `Delete`/`Backspace` to remove it. The same keys remove a selected wire.
- **Edit parameters**: select a component and edit its values in the
  properties panel on the right.
- **Run a DC operating point**: click **Run DC** to solve a single steady
  state and see node voltages/currents labeled on the canvas.
- **Run a transient simulation**: set a stop time and step size, click
  **Run Transient**, then use the playback bar (Play/Pause/Stop, or drag the
  scrub slider) to step through the precomputed result.
- **Probe a signal**: toggle **Probe**, then click a terminal to watch its
  voltage or a component's body to watch its current — traces appear on the
  oscilloscope panel below the schematic once you run a transient.
- **Save / load a circuit**: **Export JSON** downloads the current
  schematic; **Import JSON** loads one back in.

## Component library

| Component | Notes |
|---|---|
| Resistor, Capacitor, Inductor | Linear; L/C use trapezoidal-integration companion models for transient analysis |
| DC Voltage/Current Source | Independent sources |
| AC Voltage Source | Sinusoidal, transient-only |
| Diode | Shockley equation |
| Switch | Opens/closes at a configurable time |
| Op-Amp | Ideal (infinite gain, no saturation) |
| BJT (NPN) | Simplified large-signal Ebers-Moll model |
| NMOS | Level-1 (Shichman-Hodges) model |
| Ground | Reference node (0V) |

## How it works

- The circuit is solved with **Modified Nodal Analysis (MNA)**: node
  voltages plus a few extra branch-current unknowns (for voltage sources,
  the op-amp) form a linear system solved by Gaussian elimination.
- Nonlinear devices (diode, BJT, NMOS) are handled with **Newton-Raphson**
  iteration: the circuit is re-linearized around the current voltage guess
  and re-solved until it converges to a fixed point.
- A transient run precomputes the **entire** time series up front (rather
  than stepping in real time), which is what lets playback be paused,
  scrubbed, and replayed instantly.

## Project layout

```
index.html, css/style.css     Page shell and styling
js/core/                      Circuit model, linear algebra, MNA solver, transient driver
js/components/                Component catalog (UI/symbols) and device stamps (solver math)
js/editor/                    Canvas rendering, drag-and-drop, wiring, selection, properties panel
js/sim/                       DC/transient run bridges, playback, probes, oscilloscope, current-flow overlay
js/io/                        JSON schematic export/import
test/                         node:test suite verifying solver output against analytical results
server.js                     Zero-dependency static file server
```

## Current limitations

- No AC/frequency-domain (Bode plot) analysis — DC and time-domain
  transient only.
- BJT is NPN-only; no PNP.
- Device models are simplified for clarity (e.g. no channel-length
  modulation on the MOSFET, no Early effect on the BJT) rather than
  full SPICE-accuracy.
