let warnedAboutGC = false;

const gc = () => {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
    return;
  }
  if (!warnedAboutGC) {
    warnedAboutGC = true;
    process.stderr.write(
      'Warning: run with `node --expose-gc` for more stable results\n',
    );
  }
};

/** @param {number[]} values */
export const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * Runs `callback` `iterations` times and returns the mean nanoseconds per call.
 * @param {() => unknown} callback
 * @param {number} iterations
 */
export const time = (callback, iterations) => {
  const start = process.hrtime.bigint();
  let result;
  for (let iteration = 0; iteration < iterations; iteration++) {
    result = callback();
  }
  const nanoseconds = Number(process.hrtime.bigint() - start) / iterations;
  if (typeof result !== 'boolean') throw new TypeError('Expected a boolean');
  return nanoseconds;
};

/**
 * Picks an iteration count so that one timed sample takes roughly 250 ms.
 * @param {() => unknown} callback
 */
export const calibrate = (callback) => {
  let iterations = 100;
  let elapsed = time(callback, iterations) * iterations;
  while (elapsed < 50e6 && iterations < 1e7) {
    iterations *= 10;
    elapsed = time(callback, iterations) * iterations;
  }
  return Math.max(
    100,
    Math.min(1e7, Math.round((iterations * 250e6) / elapsed)),
  );
};

/**
 * @typedef {(buffer: Buffer) => boolean} IsAnimated
 */

/**
 * @typedef {object} FixtureResult
 * @property {boolean} currentResult
 * @property {boolean | undefined} baselineResult
 * @property {boolean} mismatch
 * @property {number} currentNs median nanoseconds per call
 * @property {number | undefined} baselineNs median nanoseconds per call
 * @property {number[]} currentSamplesNs
 * @property {number[]} baselineSamplesNs
 */

/**
 * Times `current` (and, when given, `baseline`) against one fixture buffer.
 * Both sides are warmed up, calibrated to ~250 ms samples, and then sampled in
 * interleaved rounds (alternating order every round) with a GC in between, so
 * that machine noise hits both sides equally. Medians are reported.
 *
 * A result mismatch between the two sides is recorded, not thrown: a PR may
 * legitimately change output, and correctness is the test suite's job.
 *
 * @param {Buffer} buffer
 * @param {{ current: IsAnimated, baseline?: IsAnimated, rounds?: number, warmup?: number }} options
 * @returns {FixtureResult}
 */
export const compareFixture = (
  buffer,
  { current, baseline, rounds = 9, warmup = 1000 },
) => {
  const runCurrent = () => current(buffer);
  const runBaseline = baseline ? () => baseline(buffer) : undefined;

  const currentResult = runCurrent();
  const baselineResult = runBaseline?.();

  for (let iteration = 0; iteration < warmup; iteration++) {
    runCurrent();
    runBaseline?.();
  }

  const currentIterations = calibrate(runCurrent);
  const baselineIterations = runBaseline ? calibrate(runBaseline) : 0;
  const currentSamplesNs = [];
  const baselineSamplesNs = [];

  for (let round = 0; round < rounds; round++) {
    gc();
    const sampleCurrent = () =>
      currentSamplesNs.push(time(runCurrent, currentIterations));
    const sampleBaseline = () => {
      if (runBaseline) {
        baselineSamplesNs.push(time(runBaseline, baselineIterations));
      }
    };
    if (round % 2 === 0) {
      sampleBaseline();
      sampleCurrent();
    } else {
      sampleCurrent();
      sampleBaseline();
    }
  }

  return {
    currentResult,
    baselineResult,
    mismatch: baseline !== undefined && currentResult !== baselineResult,
    currentNs: median(currentSamplesNs),
    baselineNs: baseline ? median(baselineSamplesNs) : undefined,
    currentSamplesNs,
    baselineSamplesNs,
  };
};
