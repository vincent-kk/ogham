/**
 * @file foldDaily.ts
 * @description Daily single-commit policy — fold today's consecutive auto commits into one via `git reset --soft`
 */
import {
  AUTO_COMMIT_SUBJECT_MARKERS,
  DEFAULT_MESSAGE_TEMPLATE,
  FOLD_SCAN_MAX_COMMITS,
} from '../../../../../constants/vaultCommitter.js';
import { formatDate } from '../../../../../core/dateFormat/dateFormat.js';
import {
  commitStaged,
  generateCommitMessage,
  listStagedFiles,
  runGit,
  stageVaultChanges,
  stagedTopLevels,
  templateStaticPrefix,
} from '../../../gitUtils/gitUtils.js';

/**
 * A subject is an auto commit when it carries one of the built-in markers
 * (legacy formats included) or starts with the custom template's static
 * prefix. Blank prefixes are ignored — they would match every commit.
 */
export function isAutoCommitSubject(
  subject: string,
  customPrefix?: string,
): boolean {
  if (AUTO_COMMIT_SUBJECT_MARKERS.some((marker) => subject.includes(marker)))
    return true;
  return customPrefix !== undefined && customPrefix.trim().length > 0
    ? subject.startsWith(customPrefix)
    : false;
}

async function revParse(cwd: string, ref: string): Promise<string | null> {
  const result = await runGit(cwd, ['rev-parse', '-q', '--verify', ref]);
  if (result.code !== 0 || result.spawnError) return null;
  const rev = result.stdout.trim();
  return rev.length > 0 ? rev : null;
}

async function commitSubject(cwd: string, rev: string): Promise<string | null> {
  const result = await runGit(cwd, ['log', '-1', '--format=%s', rev]);
  if (result.code !== 0 || result.spawnError) return null;
  return result.stdout.trim();
}

async function commitDay(cwd: string, rev: string): Promise<string | null> {
  const result = await runGit(cwd, [
    'log',
    '-1',
    '--format=%cd',
    '--date=format:%Y-%m-%d',
    rev,
  ]);
  if (result.code !== 0 || result.spawnError) return null;
  return result.stdout.trim();
}

async function resetSoft(cwd: string, rev: string): Promise<boolean> {
  const result = await runGit(cwd, ['reset', '--soft', rev]);
  return result.code === 0 && !result.spawnError;
}

/**
 * Walk down from HEAD past today's consecutive auto commits and return the
 * first commit that is NOT (auto AND dated today) — the fold base. Returns
 * null when there is nothing to fold or folding is unsafe (unborn HEAD,
 * repository root reached, scan cap exceeded).
 */
export async function findFoldBase(
  cwd: string,
  today: string,
  customPrefix?: string,
): Promise<string | null> {
  const head = await revParse(cwd, 'HEAD');
  if (!head) return null;
  let rev = head;
  let folded = false;
  for (let step = 0; step < FOLD_SCAN_MAX_COMMITS; step++) {
    const subject = await commitSubject(cwd, rev);
    const day = await commitDay(cwd, rev);
    if (subject === null || day === null) return null;
    if (!isAutoCommitSubject(subject, customPrefix) || day !== today)
      return folded && rev !== head ? rev : null;
    folded = true;
    const parent = await revParse(cwd, `${rev}^`);
    if (!parent) return null;
    rev = parent;
  }
  return null;
}

/**
 * Fold today's auto commits into one: move the branch to the fold base
 * (`git reset --soft` keeps index and working tree intact), re-stage, and
 * commit once. On commit failure the branch is restored to the original
 * HEAD and the error is rethrown.
 *
 * @returns true when a fold commit was made; false when there was nothing
 * to fold (caller should fall back to a plain commit).
 */
export async function tryFoldCommit(
  cwd: string,
  scope: readonly string[],
  messageTemplate?: string,
): Promise<boolean> {
  const template = messageTemplate ?? DEFAULT_MESSAGE_TEMPLATE;
  const customPrefix = templateStaticPrefix(template);
  const base = await findFoldBase(cwd, formatDate(new Date()), customPrefix);
  if (!base) return false;
  const origHead = await revParse(cwd, 'HEAD');
  if (!origHead || !(await resetSoft(cwd, base))) return false;
  try {
    await stageVaultChanges(cwd, scope);
    const staged = await listStagedFiles(cwd);
    await commitStaged(
      cwd,
      generateCommitMessage(
        stagedTopLevels(staged, scope),
        staged.length,
        template,
      ),
    );
    return true;
  } catch (e) {
    await resetSoft(cwd, origHead);
    throw e;
  }
}
