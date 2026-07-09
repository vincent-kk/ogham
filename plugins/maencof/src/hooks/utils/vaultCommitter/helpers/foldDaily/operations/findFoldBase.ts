/**
 * @file findFoldBase.ts
 * @description Walk HEAD downward past today's consecutive auto commits to find the fold base.
 */
import { FOLD_SCAN_MAX_COMMITS } from '../../../../../../constants/vaultCommitter.js';
import { runGit } from '../../../../gitUtils/runner/runGit.js';

import { isAutoCommitSubject } from './isAutoCommitSubject.js';
import { revParse } from './revParse.js';

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
