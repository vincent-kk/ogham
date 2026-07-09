/**
 * @file tryFoldCommit.ts
 * @description Fold today's auto commits into one via `git reset --soft`, then re-stage and re-commit.
 */
import { DEFAULT_MESSAGE_TEMPLATE } from '../../../../../../constants/vaultCommitter.js';
import { formatDate } from '../../../../../../core/dateFormat/operations/formatDate.js';
import { generateCommitMessage } from '../../../../gitUtils/message/generateCommitMessage.js';
import { stagedTopLevels } from '../../../../gitUtils/message/stagedTopLevels.js';
import { templateStaticPrefix } from '../../../../gitUtils/message/templateStaticPrefix.js';
import { runGit } from '../../../../gitUtils/runner/runGit.js';
import { commitStaged } from '../../../../gitUtils/staging/commitStaged.js';
import { listStagedFiles } from '../../../../gitUtils/staging/listStagedFiles.js';
import { stageVaultChanges } from '../../../../gitUtils/staging/stageVaultChanges.js';

import { findFoldBase } from './findFoldBase.js';
import { revParse } from './revParse.js';

async function resetSoft(cwd: string, rev: string): Promise<boolean> {
  const result = await runGit(cwd, ['reset', '--soft', rev]);
  return result.code === 0 && !result.spawnError;
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
