#!/usr/bin/env node
// scaffold-pr — deterministic branch + empty commit + Draft PR sequence
//
// Usage:
//   node scaffold-pr.mjs --branch <type>/<slug> --title <title>
//        [--body-file <path>] [--base <branch>] [--type <commit-type>]
//        [--ready] [--allow-dirty] [--reuse-branch]
//   node scaffold-pr.mjs --check
//
// The invoking model decides branch, title, and body; this script owns the
// git/gh sequence. Pure Node.js (ESM), no dependencies: it runs at plugin
// runtime where workspace packages are absent, so node:child_process is
// called directly — git and gh are native executables on every platform
// (never .cmd shims), spawned with argv arrays and no shell. stdout is
// exactly one JSON line; child stderr is folded into failure messages.
//
// Shared byte-identical across ogham plugins — change every copy together.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

/** One-line usage reminder embedded in USAGE failures. */
const USAGE =
  'Usage: scaffold-pr.mjs --branch <type>/<slug> ' +
  '(--title <title> | --title-file <path>) [--body-file <path>] ' +
  '[--message-file <path>] [--base <branch>] [--type <commit-type>] ' +
  '[--ready] [--allow-dirty] [--reuse-branch] | scaffold-pr.mjs --check';

/**
 * Placeholder PR body used when the caller passes no --body-file; wording
 * matches the skill's Body section so both surfaces stay recognizably one.
 */
const DEFAULT_BODY = [
  '## Purpose',
  '',
  '_To be filled as work begins._',
  '',
  '## Scope',
  '',
  '- [ ] To be defined as implementation lands',
  '',
].join('\n');

/**
 * CLI surface. Long-form only; the invoking model is the sole caller, so
 * there are no short aliases to drift.
 */
const OPTIONS = {
  check: { type: 'boolean', default: false },
  branch: { type: 'string' },
  title: { type: 'string' },
  'title-file': { type: 'string' },
  'body-file': { type: 'string' },
  'message-file': { type: 'string' },
  base: { type: 'string' },
  type: { type: 'string', default: 'chore' },
  ready: { type: 'boolean', default: false },
  'allow-dirty': { type: 'boolean', default: false },
  'reuse-branch': { type: 'boolean', default: false },
};

/**
 * Print the script's single JSON result line.
 *
 * @param {Record<string, unknown>} payload Result object for the caller.
 * @returns {void}
 */
function emit(payload) {
  console.log(JSON.stringify(payload));
}

/**
 * Report a failure as the JSON result line and stop the process.
 *
 * @param {string} code Stable machine-readable failure code.
 * @param {string} message Human-readable explanation, child stderr folded in.
 * @param {Record<string, unknown>} [extra] Additional structured fields.
 * @returns {never} The process exits with status 1.
 */
function fail(code, message, extra = {}) {
  emit({ ok: false, code, message, ...extra });
  process.exit(1);
}

/**
 * Compress a child process's stderr into a single-line tail suitable for a
 * JSON failure message.
 *
 * @param {string} stderr Raw captured stderr.
 * @returns {string} At most the last 400 characters, whitespace flattened.
 */
function detail(stderr) {
  return stderr.trim().replace(/\s+/g, ' ').slice(-400);
}

/**
 * Spawn a command with argv passed verbatim — no shell, so quoting rules
 * never differ by platform.
 *
 * @param {string} command Executable name resolved via PATH.
 * @param {string[]} args Arguments handed to the executable as-is.
 * @returns {{status: number, stdout: string, stderr: string, missing: boolean}}
 *   Exit status (-1 when the process could not start), captured output, and
 *   whether the executable itself was missing (ENOENT).
 */
function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    missing: result.error !== undefined && result.error.code === 'ENOENT',
  };
}

/**
 * Reject branch names git would refuse, before any repository state changes.
 *
 * @param {string} name Candidate branch name.
 * @returns {void} Returns only when the name is acceptable.
 */
function validateBranch(name) {
  if (!/^[A-Za-z0-9._/-]+$/.test(name) || name.includes('..'))
    fail(
      'USAGE',
      `Branch name "${name}" must be ASCII letters, digits, ".", "_", "-", "/" and must not contain "..".`,
    );
}

/**
 * Verify the ground the mutate steps stand on: a git repository, a working
 * authenticated gh, and a resolvable base branch. Ordered so gh-free causes
 * surface first and each failure names exactly one missing precondition.
 *
 * @param {string | undefined} baseFlag Base branch override from --base.
 * @returns {{repoRoot: string, dirtyFiles: string[], base: string}} Facts
 *   the caller dispatches on; never returns when a precondition fails (the
 *   process exits with a stable code instead).
 */
function preflight(baseFlag) {
  const top = run('git', ['rev-parse', '--show-toplevel']);
  if (top.missing) fail('GIT_MISSING', 'git is not installed or not on PATH.');
  if (top.status !== 0)
    fail('NOT_A_REPO', 'The current directory is not inside a git repository.');
  const auth = run('gh', ['auth', 'status']);
  if (auth.missing)
    fail('GH_MISSING', 'GitHub CLI (gh) is not installed or not on PATH.');
  if (auth.status !== 0)
    fail(
      'GH_UNAUTHENTICATED',
      `gh is installed but not authenticated: ${detail(auth.stderr)}`,
    );
  const status = run('git', ['status', '--porcelain']);
  const dirtyFiles = status.stdout.split('\n').filter((line) => line !== '');
  let base = baseFlag;
  if (base === undefined) {
    const view = run('gh', ['repo', 'view', '--json', 'defaultBranchRef']);
    if (view.status !== 0)
      fail(
        'BASE_RESOLVE_FAILED',
        `gh repo view failed: ${detail(view.stderr)}`,
      );
    try {
      base = JSON.parse(view.stdout).defaultBranchRef.name;
    } catch {
      base = undefined;
    }
  }
  if (!base)
    fail(
      'BASE_RESOLVE_FAILED',
      'No --base given and the default branch could not be resolved.',
    );
  return { repoRoot: top.stdout.trim(), dirtyFiles, base };
}

/**
 * Ask git whether a local branch already holds the name.
 *
 * @param {string} branch Branch name to probe.
 * @returns {boolean} True when refs/heads/<branch> resolves.
 */
function branchExists(branch) {
  const probe = run('git', [
    'rev-parse',
    '--verify',
    '--quiet',
    `refs/heads/${branch}`,
  ]);
  return probe.status === 0;
}

/**
 * Run one git mutation step, converting a non-zero exit into a stable
 * failure code.
 *
 * @param {string} code Failure code emitted when the step fails.
 * @param {string[]} args git arguments for the step.
 * @returns {void} Returns only on success.
 */
function gitStep(code, args) {
  const result = run('git', args);
  if (result.status !== 0)
    fail(code, `git ${args[0]} failed: ${detail(result.stderr)}`);
}

/**
 * Resolve the PR title from exactly one of --title / --title-file. A file
 * is the safe channel for arbitrary text: it never crosses a shell hop.
 *
 * @param {{title?: string, 'title-file'?: string}} values Parsed CLI values.
 * @returns {string} The title text, trimmed when read from a file.
 */
function resolveTitle(values) {
  const inline = values.title;
  const fromFile = values['title-file'];
  if ((inline === undefined) === (fromFile === undefined))
    fail(
      'USAGE',
      `Exactly one of --title or --title-file is required. ${USAGE}`,
    );
  if (inline !== undefined) return inline;
  if (!existsSync(fromFile))
    fail('USAGE', `--title-file "${fromFile}" does not exist.`);
  return readFileSync(fromFile, 'utf8').trim();
}

/**
 * Choose how the PR body reaches gh.
 *
 * @param {string | undefined} bodyFile Path from --body-file, if given.
 * @returns {string[]} gh arguments carrying the body.
 */
function bodyArguments(bodyFile) {
  if (bodyFile === undefined) return ['--body', DEFAULT_BODY];
  if (!existsSync(bodyFile))
    fail('USAGE', `--body-file "${bodyFile}" does not exist.`);
  return ['--body-file', bodyFile];
}

/**
 * Look up an open PR whose head is the given branch.
 *
 * @param {string} branch Head branch name.
 * @returns {string | null} The PR's URL, or null when none exists.
 */
function findExistingPr(branch) {
  const result = run('gh', ['pr', 'list', '--head', branch, '--json', 'url']);
  if (result.status !== 0)
    fail('PR_LOOKUP_FAILED', `gh pr list failed: ${detail(result.stderr)}`);
  let rows;
  try {
    rows = JSON.parse(result.stdout);
  } catch {
    fail('PR_LOOKUP_FAILED', 'gh pr list returned unparseable JSON.');
  }
  return rows.length > 0 ? rows[0].url : null;
}

/**
 * Create the Draft (or ready) PR and return its URL.
 *
 * @param {{base: string, branch: string, title: string, ready: boolean,
 *   bodyArgs: string[]}} input Resolved PR fields; bodyArgs is either
 *   ['--body', text] or ['--body-file', path].
 * @returns {string} The created PR's URL as printed by gh.
 */
function createPr(input) {
  const args = [
    'pr',
    'create',
    '--base',
    input.base,
    '--head',
    input.branch,
    '--title',
    input.title,
    ...input.bodyArgs,
  ];
  if (!input.ready) args.push('--draft');
  const result = run('gh', args);
  if (result.status !== 0)
    fail('PR_CREATE_FAILED', `gh pr create failed: ${detail(result.stderr)}`);
  const lines = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  return lines[lines.length - 1] ?? '';
}

/**
 * Parse the CLI surface, verify preconditions, and run the scaffold
 * sequence: fresh base → branch → empty commit → push → PR, reusing an
 * already-open PR instead of duplicating it.
 *
 * @returns {void} Emits exactly one JSON line and sets the exit status.
 */
function main() {
  let values;
  try {
    ({ values } = parseArgs({
      options: OPTIONS,
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    fail(
      'USAGE',
      `${error instanceof Error ? error.message : String(error)} — ${USAGE}`,
    );
  }
  let title = '';
  if (!values.check) {
    if (values.branch === undefined)
      fail('USAGE', `--branch is required. ${USAGE}`);
    validateBranch(values.branch);
    title = resolveTitle(values);
    const messageFile = values['message-file'];
    if (messageFile !== undefined && !existsSync(messageFile))
      fail('USAGE', `--message-file "${messageFile}" does not exist.`);
  }
  const facts = preflight(values.base);
  if (values.check) {
    emit({
      ok: true,
      check: {
        repoRoot: facts.repoRoot,
        base: facts.base,
        dirtyFiles: facts.dirtyFiles,
      },
    });
    return;
  }
  if (facts.dirtyFiles.length > 0 && !values['allow-dirty'])
    fail(
      'DIRTY_TREE',
      'The working tree has uncommitted changes; ask the user, then rerun with --allow-dirty to proceed anyway.',
      { dirtyFiles: facts.dirtyFiles },
    );
  const exists = branchExists(values.branch);
  if (exists && !values['reuse-branch'])
    fail(
      'BRANCH_EXISTS',
      `Branch "${values.branch}" already exists; rerun with --reuse-branch or pick another name.`,
    );
  if (exists) gitStep('SWITCH_FAILED', ['switch', values.branch]);
  else {
    gitStep('SWITCH_FAILED', ['switch', facts.base]);
    gitStep('PULL_FAILED', ['pull', '--ff-only']);
    gitStep('SWITCH_FAILED', ['switch', '-c', values.branch]);
  }
  const messageFile = values['message-file'];
  gitStep(
    'COMMIT_FAILED',
    messageFile === undefined
      ? ['commit', '--allow-empty', '-m', `${values.type}: scaffold empty PR`]
      : ['commit', '--allow-empty', '-F', messageFile],
  );
  gitStep('PUSH_FAILED', ['push', '-u', 'origin', values.branch]);
  const existingUrl = findExistingPr(values.branch);
  if (existingUrl !== null) {
    emit({
      ok: true,
      url: existingUrl,
      branch: values.branch,
      base: facts.base,
      existing: true,
    });
    return;
  }
  const url = createPr({
    base: facts.base,
    branch: values.branch,
    title,
    ready: values.ready,
    bodyArgs: bodyArguments(values['body-file']),
  });
  emit({
    ok: true,
    url,
    branch: values.branch,
    base: facts.base,
    existing: false,
  });
}

main();
