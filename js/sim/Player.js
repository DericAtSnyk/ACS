// Play/pause/stop/scrub over a precomputed transient run. Playback always
// takes a fixed wall-clock duration regardless of how much simulated time or
// how many steps the run has, so a 10ms RC charge and a 5s RL rise both play
// back at a humanly-watchable pace.
const PLAYBACK_DURATION_SECONDS = 4;

export function startPlayback(state) {
  if (!state.runResult || state.runResult.kind !== 'transient') return;
  const lastIndex = state.runResult.times.length - 1;
  if (state.scrubIndex >= lastIndex) state.scrubIndex = 0;
  state.playing = true;
}

export function pausePlayback(state) {
  state.playing = false;
}

export function stopPlayback(state) {
  state.playing = false;
  state.scrubIndex = 0;
}

// Advances scrubIndex by `dtSeconds` of real wall-clock time. No-op unless
// currently playing a transient result.
export function tickPlayback(state, dtSeconds) {
  if (!state.playing || !state.runResult || state.runResult.kind !== 'transient') return;
  const numSteps = state.runResult.times.length;
  state.scrubIndex += (numSteps / PLAYBACK_DURATION_SECONDS) * dtSeconds;
  const lastIndex = numSteps - 1;
  if (state.scrubIndex >= lastIndex) {
    state.scrubIndex = lastIndex;
    state.playing = false;
  }
}
