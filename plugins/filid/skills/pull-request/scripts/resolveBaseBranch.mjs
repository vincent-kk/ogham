#!/usr/bin/env node
/**
 * Invoked by pull-request Stage 0; this canonical CLI owns base inference.
 *
 * Parent selection is a heuristic over the local refs snapshot. Among candidates
 * with a unique merge-base, minimize HEAD-only commits, then prefer the default
 * branch, fewer base-only commits, and branch name. Equal HEAD-side distances
 * are reported as ambiguous; Git does not retain a unique parent branch name.
 * Origin refs take precedence over local names to match the published PR base.
 * Candidates containing HEAD, unrelated roots, and criss-cross bases cannot
 * provide a branch-only PR comparison. Shallow history needs an explicit base.
 *
 * Sources: https://git-scm.com/docs/git-merge-base (common-ancestor ordering)
 * and https://git-scm.com/docs/git-diff (three-dot comparison). Fork-point needs
 * a known candidate and reflog history; using it as the diff boundary could
 * disagree with GitHub after history rewriting. GitHub CLI itself selects a
 * configured/default base: https://cli.github.com/manual/gh_pr_create . This CLI
 * supplies a graph estimate instead, without ranking timestamps or file churn.
 */
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';

/** Read Git facts without shell interpolation or repository mutations.
 * @param {string} cwd Repository directory supplied by the caller.
 * @param {string[]} args Literal Git arguments.
 * @returns {string} Trimmed stdout; Git and process errors propagate.
 */
function readGit(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30_000,
  }).trim();
}

/** Read an optional Git fact, preserving errors other than an absent result.
 * @param {string} cwd Repository directory supplied by the caller.
 * @param {string[]} args Git query whose exit 1 means absence.
 * @returns {string | null} Output or null; unexpected failures propagate.
 */
function tryReadGit(cwd, args) {
  try {
    return readGit(cwd, args);
  } catch (error) {
    if (error.status === 1) return null;
    throw error;
  }
}

try {
  const { values } = parseArgs({
    options: { 'project-root': { type: 'string' }, base: { type: 'string' } },
    strict: true,
    allowPositionals: false,
  });
  const cwd = values['project-root'] ?? process.cwd();
  const branch = tryReadGit(cwd, [
    'symbolic-ref',
    '--quiet',
    '--short',
    'HEAD',
  ]);
  if (!branch) throw new Error('An attached branch is required.');
  const head = tryReadGit(cwd, [
    'rev-parse',
    '--verify',
    '--quiet',
    'HEAD^{commit}',
  ]);
  if (!head) throw new Error('The current branch has no commits.');
  const explicit = values.base;
  let refs;
  let defaultRef = null;

  if (explicit !== undefined) {
    const candidates = explicit.startsWith('refs/')
      ? [explicit]
      : [
          ...(explicit.startsWith('origin/')
            ? [`refs/remotes/${explicit}`]
            : []),
          `refs/remotes/origin/${explicit}`,
          `refs/heads/${explicit}`,
        ];
    const baseRef = candidates.find(
      (ref) =>
        (ref.startsWith('refs/heads/') ||
          ref.startsWith('refs/remotes/origin/')) &&
        tryReadGit(cwd, ['check-ref-format', ref]) !== null &&
        tryReadGit(cwd, [
          'rev-parse',
          '--verify',
          '--quiet',
          '--end-of-options',
          `${ref}^{commit}`,
        ]) !== null &&
        tryReadGit(cwd, ['symbolic-ref', '--quiet', ref]) === null,
    );
    if (!baseRef)
      throw new Error(
        `Could not resolve base branch: ${explicit}. Pass --base with a local or origin branch.`,
      );
    refs = [baseRef];
  } else {
    if (readGit(cwd, ['rev-parse', '--is-shallow-repository']) === 'true')
      throw new Error(
        'Cannot infer a base from shallow history. Deepen the checkout or pass --base explicitly.',
      );
    const lines = readGit(cwd, [
      'for-each-ref',
      '--format=%(refname)%09%(symref)',
      'refs/heads/',
      'refs/remotes/origin/',
    ]).split('\n');
    refs = lines
      .filter((line) => !line.split('\t')[1])
      .map((line) => line.split('\t')[0])
      .filter(Boolean);
    refs = refs.filter(
      (ref) =>
        !ref.startsWith('refs/heads/') ||
        !refs.includes(
          `refs/remotes/origin/${ref.slice('refs/heads/'.length)}`,
        ),
    );
    refs = refs.filter(
      (ref) =>
        ref !== `refs/heads/${branch}` &&
        ref !== `refs/remotes/origin/${branch}`,
    );
    const remoteHead = tryReadGit(cwd, [
      'symbolic-ref',
      '--quiet',
      'refs/remotes/origin/HEAD',
    ]);
    defaultRef =
      [
        remoteHead,
        'refs/remotes/origin/main',
        'refs/remotes/origin/master',
        'refs/heads/main',
        'refs/heads/master',
      ].find((ref) => refs.includes(ref)) ?? null;
  }

  const candidates = [];
  for (const baseRef of refs) {
    const base = readGit(cwd, [
      'rev-parse',
      '--verify',
      '--end-of-options',
      `${baseRef}^{commit}`,
    ]);
    const mergeBases = tryReadGit(cwd, ['merge-base', '--all', base, head]);
    if (mergeBases === null || mergeBases.includes('\n')) {
      if (explicit !== undefined)
        throw new Error(
          'The requested base must have exactly one merge base with HEAD.',
        );
      continue;
    }
    const [behind, ahead] = readGit(cwd, [
      'rev-list',
      '--left-right',
      '--count',
      `${base}...${head}`,
    ])
      .split(/\s+/u)
      .map(Number);
    if (ahead === 0) {
      if (explicit !== undefined)
        throw new Error(`The branch has no commits ahead of ${baseRef}.`);
      continue;
    }
    candidates.push({
      baseRef,
      baseBranch: baseRef.replace(/^refs\/(?:heads\/|remotes\/origin\/)/u, ''),
      mergeBase: mergeBases,
      ahead,
      behind,
    });
  }
  if (candidates.length === 0)
    throw new Error(
      'No eligible base branch. Refresh local refs or pass --base explicitly.',
    );

  candidates.sort(
    (a, b) =>
      a.ahead - b.ahead ||
      Number(b.baseRef === defaultRef) - Number(a.baseRef === defaultRef) ||
      a.behind - b.behind ||
      (a.baseBranch < b.baseBranch ? -1 : a.baseBranch > b.baseBranch ? 1 : 0),
  );
  const selected = candidates[0];
  const tiedCandidates =
    explicit === undefined
      ? candidates
          .filter((candidate) => candidate.ahead === selected.ahead)
          .map((candidate) => candidate.baseBranch)
          .sort()
      : [];
  process.stdout.write(
    `${JSON.stringify({ ...selected, head, source: explicit === undefined ? 'graph' : 'explicit', ambiguous: tiedCandidates.length > 1, tiedCandidates: tiedCandidates.length > 1 ? tiedCandidates : [] })}\n`,
  );
} catch (error) {
  process.stderr.write(`[filid:pull-request] ${error.message}\n`);
  process.exitCode = 1;
}
