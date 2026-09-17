import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const EXPORTED_DIR = 'src';

/**
 * @param {string[]} args
 * @param {{ encoding?: 'utf8' | 'buffer' }} [options]
 */
const git = (args, { encoding = 'utf8' } = {}) =>
  execFileSync('git', ['-C', REPO_ROOT, ...args], {
    encoding,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const gitLines = (args) =>
  git(args)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Best-effort `git fetch` for refs of the form `<remote>/<branch>`, so that a
 * comparison against e.g. `origin/main` uses the fresh remote state. Local
 * refs (`main`, `HEAD`, a sha) are left alone since fetching would not update
 * them. Failures (offline, unknown branch) only produce a warning.
 * @param {string} ref
 * @returns {boolean} whether a fetch was performed
 */
export const fetchRef = (ref) => {
  const separator = ref.indexOf('/');
  if (separator <= 0) return false;
  const remote = ref.slice(0, separator);
  const branch = ref.slice(separator + 1);
  if (!branch || !gitLines(['remote']).includes(remote)) return false;

  process.stderr.write(`Fetching ${branch} from ${remote}...\n`);
  try {
    git(['fetch', '--quiet', remote, branch]);
    return true;
  } catch (error) {
    const detail = String(error?.stderr ?? error?.message ?? error)
      .trim()
      .split('\n')
      .at(-1);
    process.stderr.write(
      `Warning: could not fetch ${ref}, using the local ref (${detail})\n`,
    );
    return false;
  }
};

/**
 * Exports the `src/` tree of a git ref into a temporary directory that is
 * removed when the process exits. Uses plain git plumbing, so nothing is
 * registered in the repository (unlike `git worktree`).
 * @param {string} ref
 * @returns {{ dir: string, commit: string, entry: string }}
 */
export const exportRef = (ref) => {
  let commit;
  try {
    commit = git([
      'rev-parse',
      '--verify',
      '--quiet',
      `${ref}^{commit}`,
    ]).trim();
  } catch {
    throw new Error(
      `Unknown git ref "${ref}". Check the name or run "git fetch" first.`,
    );
  }

  const files = gitLines([
    'ls-tree',
    '-r',
    '--name-only',
    commit,
    '--',
    EXPORTED_DIR,
  ]);
  if (files.length === 0) {
    throw new Error(`Git ref "${ref}" has no ${EXPORTED_DIR}/ directory.`);
  }

  const dir = mkdtempSync(join(tmpdir(), 'is-animated-baseline-'));
  process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

  for (const file of files) {
    const target = join(dir, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      target,
      git(['show', `${commit}:${file}`], { encoding: 'buffer' }),
    );
  }

  return { dir, commit, entry: join(dir, EXPORTED_DIR, 'index.mjs') };
};
