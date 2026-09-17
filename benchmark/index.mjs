import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import isAnimated from '../src/index.mjs';
import { exportRef, fetchRef } from './baseline.mjs';
import { createFixtures, formatBytes } from './fixtures.mjs';
import { compareFixture } from './harness.mjs';

const USAGE = `Usage: node --expose-gc benchmark/index.mjs [options]

Options:
  --baseline <path>        Path to a baseline src/index.mjs to compare against.
                           Without a baseline only the current code is timed.
  --baseline-ref <ref>     Git ref (e.g. origin/main, HEAD~1, a tag or a sha)
                           whose src/ tree is exported to a temporary directory
                           and used as the baseline. A <remote>/<branch> ref is
                           fetched first. Mutually exclusive with --baseline.
  --no-fetch               Skip the fetch attempt for --baseline-ref
  --baseline-label <name>  Column label for the baseline
                           (default: the --baseline-ref value or "baseline")
  --current-label <name>   Column label for the current code (default: current)
  --json <file>            Write a JSON report to <file>
  --markdown <file>        Write the Markdown report to <file>
  --max-regression <n>     Fail when current/baseline exceeds <n>
                           (default: $BENCHMARK_MAX_REGRESSION or 1.25)
  --min-delta-ns <n>       Ignore regressions slower by less than <n> ns
                           (default: $BENCHMARK_MIN_DELTA_NS or 500)
  --rounds <n>             Timed rounds per fixture and side (default: 9)
  --help                   Show this help
`;

const EXIT_REGRESSION = 1;
const EXIT_USAGE = 2;

const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(EXIT_USAGE);
};

const parseNumber = (name, value, fallback) => {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    fail(`Invalid value for --${name}: ${value}`);
  }
  return number;
};

let args;
try {
  args = parseArgs({
    strict: true,
    allowPositionals: false,
    options: {
      baseline: { type: 'string' },
      'baseline-ref': { type: 'string' },
      'no-fetch': { type: 'boolean', default: false },
      'baseline-label': { type: 'string' },
      'current-label': { type: 'string', default: 'current' },
      json: { type: 'string' },
      markdown: { type: 'string' },
      'max-regression': { type: 'string' },
      'min-delta-ns': { type: 'string' },
      rounds: { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  }).values;
} catch (error) {
  fail(`${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`);
}

if (args.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}

if (args.baseline && args['baseline-ref']) {
  fail('--baseline and --baseline-ref are mutually exclusive');
}

const labels = {
  baseline: args['baseline-label'] ?? args['baseline-ref'] ?? 'baseline',
  current: args['current-label'],
};
const thresholds = {
  maxRegression: parseNumber(
    'max-regression',
    args['max-regression'] ?? process.env.BENCHMARK_MAX_REGRESSION,
    1.25,
  ),
  minDeltaNs: parseNumber(
    'min-delta-ns',
    args['min-delta-ns'] ?? process.env.BENCHMARK_MIN_DELTA_NS,
    500,
  ),
};
const rounds = parseNumber('rounds', args.rounds, 9);
if (rounds < 1) fail('--rounds must be at least 1');

/** @type {import('./harness.mjs').IsAnimated | undefined} */
let baseline;
/** @type {string | undefined} */
let baselinePath = args.baseline
  ? resolve(process.cwd(), args.baseline)
  : undefined;
/** @type {{ ref: string, commit: string } | undefined} */
let baselineRef;
if (args['baseline-ref']) {
  const ref = args['baseline-ref'];
  if (!args['no-fetch']) fetchRef(ref);
  try {
    const exported = exportRef(ref);
    baselinePath = exported.entry;
    baselineRef = { ref, commit: exported.commit };
    process.stderr.write(
      `Baseline: ${ref} (${exported.commit.slice(0, 7)}) exported to ${exported.dir}\n`,
    );
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
if (baselinePath) {
  try {
    const module = await import(pathToFileURL(baselinePath).href);
    if (typeof module.default !== 'function') {
      throw new TypeError('module has no default export function');
    }
    baseline = module.default;
  } catch (error) {
    fail(
      `Could not load baseline from ${baselinePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const classify = ({ baselineNs, currentNs, mismatch }) => {
  if (baselineNs === undefined) return 'measured';
  if (mismatch) return 'mismatch';
  const ratio = currentNs / baselineNs;
  if (ratio > thresholds.maxRegression) {
    return currentNs - baselineNs >= thresholds.minDeltaNs
      ? 'regression'
      : 'slower';
  }
  if (ratio < 1 / thresholds.maxRegression) return 'faster';
  return 'neutral';
};

const results = createFixtures().map(({ buffer, ...fixture }) => {
  process.stderr.write(`Benchmarking ${fixture.name}...\n`);
  const timing = compareFixture(buffer, {
    current: isAnimated,
    baseline,
    rounds,
  });
  const ratio =
    timing.baselineNs === undefined
      ? undefined
      : timing.currentNs / timing.baselineNs;
  return {
    ...fixture,
    bytes: buffer.length,
    ...timing,
    ratio,
    changePercent: ratio === undefined ? undefined : (ratio - 1) * 100,
    deltaNs:
      timing.baselineNs === undefined
        ? undefined
        : timing.currentNs - timing.baselineNs,
    status: classify(timing),
  };
});

const regressions = results
  .filter((result) => result.status === 'regression')
  .map((result) => result.name);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const formatMicroseconds = (nanoseconds) =>
  `${(nanoseconds / 1000).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} µs`;

const formatChange = (result) => {
  if (result.status === 'mismatch') {
    return `output differs (${labels.baseline}: ${result.baselineResult}, ${labels.current}: ${result.currentResult})`;
  }
  const sign = result.changePercent >= 0 ? '+' : '';
  const change = `${result.ratio.toFixed(2)}x (${sign}${result.changePercent.toFixed(1)}%)`;
  switch (result.status) {
    case 'regression':
      return `${change} **REGRESSION**`;
    case 'slower':
      return `${change} slower (below noise floor)`;
    case 'faster':
      return `${change} faster`;
    default:
      return change;
  }
};

const environment = [
  `Node ${process.version}, ${process.platform} ${process.arch}, ${cpus()[0]?.model ?? 'unknown CPU'}`,
  baselineRef &&
    `${labels.baseline}${labels.baseline === baselineRef.ref ? '' : ` = ${baselineRef.ref}`} at ${baselineRef.commit.slice(0, 7)}`,
]
  .filter(Boolean)
  .join('. ');

const markdownLines = baseline
  ? [
      `| Fixture | Size | ${labels.baseline} | ${labels.current} | Change |`,
      '|---|---:|---:|---:|---:|',
      ...results.map(
        (result) =>
          `| ${result.name} | ${formatBytes(result.bytes)} | ${formatMicroseconds(result.baselineNs)} | ${formatMicroseconds(result.currentNs)} | ${formatChange(result)} |`,
      ),
      '',
      `Regression rule: ${labels.current}/${labels.baseline} > ${thresholds.maxRegression.toFixed(2)}x and at least ${formatMicroseconds(thresholds.minDeltaNs)} slower. ${environment}.`,
    ]
  : [
      `| Fixture | Size | ${labels.current} |`,
      '|---|---:|---:|',
      ...results.map(
        (result) =>
          `| ${result.name} | ${formatBytes(result.bytes)} | ${formatMicroseconds(result.currentNs)} |`,
      ),
      '',
      `${environment}.`,
    ];
const markdown = `${markdownLines.join('\n')}\n`;

const writeReport = (file, content) => {
  const path = resolve(process.cwd(), file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};

if (args.markdown) writeReport(args.markdown, markdown);
if (args.json) {
  writeReport(
    args.json,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        cpu: cpus()[0]?.model ?? null,
        labels,
        baselinePath: baselinePath ?? null,
        baselineRef: baselineRef?.ref ?? null,
        baselineCommit: baselineRef?.commit ?? null,
        thresholds,
        rounds,
        results,
        regressions,
        passed: regressions.length === 0,
      },
      null,
      2,
    )}\n`,
  );
}

process.stdout.write(markdown);

if (regressions.length > 0) {
  process.stderr.write(
    `\nPerformance regression detected in ${regressions.length} fixture(s):\n${regressions.map((name) => `  - ${name}`).join('\n')}\n`,
  );
  process.exit(EXIT_REGRESSION);
}
