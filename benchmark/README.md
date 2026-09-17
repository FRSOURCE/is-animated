# Benchmark

Times `isAnimated()` from `src/index.mjs` against every supported format
(GIF, PNG, WebP, AVIF) and, optionally, compares it with a baseline build of
the library. CI uses it to compare each pull request against `main`.

## Running locally

Time the current code only:

```sh
pnpm benchmark
```

Compare the working tree (uncommitted changes included) against `origin/main`:

```sh
pnpm benchmark:main
```

Or against any other git ref (a branch, tag, sha, `HEAD~1`, ...):

```sh
pnpm benchmark --baseline-ref v3.0.0 --current-label PR
```

The script exports the `src/` tree of the ref into a temporary directory with
plain git commands (no second checkout or worktree is needed), uses it as the
baseline and removes it on exit. A `<remote>/<branch>` ref is fetched first so
the comparison uses the fresh remote state; when the fetch fails (for example
offline) a warning is printed and the local ref is used. Pass `--no-fetch` to
skip the attempt.

To compare against code that lives outside this repository, pass the path to
its entry module with `--baseline <path>` instead. It only needs a default
`isAnimated` export.

### Options

| Flag                      | Default                                  | Description                                                                                                               |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--baseline <path>`       | none                                     | Path to a baseline `src/index.mjs`. Enables comparison.                                                                   |
| `--baseline-ref <ref>`    | none                                     | Git ref whose `src/` tree is exported and used as the baseline. Enables comparison; mutually exclusive with `--baseline`. |
| `--no-fetch`              | off                                      | Do not try to `git fetch` a `<remote>/<branch>` ref before exporting it                                                   |
| `--baseline-label <name>` | the `--baseline-ref` value or `baseline` | Column label for the baseline                                                                                             |
| `--current-label <name>`  | `current`                                | Column label for the current code                                                                                         |
| `--json <file>`           | none                                     | Write a JSON report                                                                                                       |
| `--markdown <file>`       | none                                     | Write the Markdown report (it is always printed as well)                                                                  |
| `--max-regression <n>`    | `$BENCHMARK_MAX_REGRESSION` or 1.25      | Ratio above which a fixture counts as a regression                                                                        |
| `--min-delta-ns <n>`      | `$BENCHMARK_MIN_DELTA_NS` or 500         | Absolute slowdown below which a regression is ignored                                                                     |
| `--rounds <n>`            | 9                                        | Timed rounds per fixture and side                                                                                         |

Exit code is `1` when a regression is detected and `2` on usage or import
errors.

## Fixtures

No image assets are stored in the repository. Small fixtures are the
`regular.*` files from `__tests__/animated` and `__tests__/static`; large ones
are generated in memory with Node.js:

| Fixture                                     | Source                                                     |
| ------------------------------------------- | ---------------------------------------------------------- |
| 15.3 MiB animated PNG (850 metadata chunks) | valid 1×1 APNG, `tEXt` chunks after the last `fdAT`        |
| 31.2 MiB static PNG                         | valid 1×1 PNG, one `tEXt` chunk before `IDAT`              |
| 16 MiB animated GIF                         | two frames, image data of the first frame carries the size |
| 16 MiB static GIF                           | one frame, image data carries the size                     |
| small animated/static PNG, GIF, WebP, AVIF  | `__tests__/{animated,static}/regular.*`                    |

Only the GIF and PNG parsers scale with input size. WebP and AVIF detection
reads fixed header offsets, so large synthetic files would add nothing.

## Methodology

For every fixture both sides are warmed up, calibrated so that one timed sample
takes about 250 ms, and then sampled in interleaved rounds (alternating order
each round) with a garbage collection between rounds, so machine noise hits
both sides equally. Medians are reported. Run with `node --expose-gc` (the
`pnpm benchmark` script does) or the GC step is skipped with a warning.

A fixture counts as a regression when

```
current / baseline > max-regression   (default 1.25, i.e. 25 % slower)
and current - baseline >= min-delta-ns (default 500 ns)
```

The absolute floor keeps sub-microsecond fixtures from failing on runner
jitter. If the two sides return different results for a fixture, the row is
marked `output differs` and never counts as a regression; correctness is the
test suite's job.

## CI

Two workflows implement the pull request check:

- `.github/workflows/benchmark.yml` runs on `pull_request` with a read-only
  token. It checks out the PR and the PR's base commit (into `baseline/`), runs
  the PR's benchmark script with `--baseline baseline/src/index.mjs`, writes the
  table to the job summary, uploads `results.md`, `results.json` and `pr.json`
  as the `benchmark-results` artifact, and fails when a regression is detected.
- `.github/workflows/benchmark-comment.yml` runs on `workflow_run` after the
  benchmark completes. It downloads the artifact and creates or updates a
  sticky PR comment with the table. Because it never executes PR code, it can
  hold a write token and therefore also comments on PRs from forks.

`workflow_run` workflows execute the version on the default branch, so the
comment workflow only becomes active once it has landed on `main`. Thresholds
can be tuned in `benchmark.yml` via the `BENCHMARK_MAX_REGRESSION` and
`BENCHMARK_MIN_DELTA_NS` environment variables without touching code.
