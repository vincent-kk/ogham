/**
 * @file runVaultCommitter.ts
 * @description SessionEnd / /clear Hook — Auto-commit vault changes (scope-driven,
 * default: 5-Layer tree + .maencof-meta/).
 *
 * Triggers: SessionEnd (session exit) and UserPromptSubmit (when prompt matches skip_patterns, default /clear)
 * Opt-in only: requires .maencof-meta/vault-commit.json with { "enabled": true }
 * Always returns { continue: true } — never blocks session exit or prompt submission.
 */
import { DEFAULT_COMMIT_SCOPE } from '../../../../constants/vaultCommitter.js';
import { appendErrorLogSafe } from '../../../../core/errorLog/operations/appendErrorLogSafe.js';
import { isMaencofVault } from '../../../shared/isMaencofVault.js';
import { generateCommitMessage } from '../../gitUtils/message/generateCommitMessage.js';
import { stagedTopLevels } from '../../gitUtils/message/stagedTopLevels.js';
import { getGitRoot } from '../../gitUtils/repo/getGitRoot.js';
import { isGitRepo } from '../../gitUtils/repo/isGitRepo.js';
import { isIndexLocked } from '../../gitUtils/repo/isIndexLocked.js';
import { commitStaged } from '../../gitUtils/staging/commitStaged.js';
import { hasVaultChanges } from '../../gitUtils/staging/hasVaultChanges.js';
import { listStagedFiles } from '../../gitUtils/staging/listStagedFiles.js';
import { stageVaultChanges } from '../../gitUtils/staging/stageVaultChanges.js';
import { tryFoldCommit } from '../helpers/foldDaily/operations/tryFoldCommit.js';
import type {
  VaultCommitterEvent,
  VaultCommitterInput,
  VaultCommitterResult,
} from '../types/types.js';

import { readVaultCommitConfig } from './readVaultCommitConfig.js';
import { shouldCommitOnPrompt } from './shouldCommitOnPrompt.js';

/**
 * vault-committer hook handler.
 *
 * Flow: event gate → config check → vault check → git repo check → index.lock check
 *       → scoped change check → stage (sensitive excludes ride along)
 *       → daily fold OR plain commit → return
 *
 * For UserPromptSubmit: only proceeds when prompt matches skip_patterns.
 * Every step that fails silently returns { continue: true }.
 */
export async function runVaultCommitter(
  input: VaultCommitterInput,
  event?: VaultCommitterEvent,
): Promise<VaultCommitterResult> {
  try {
    const cwd = input.cwd ?? process.cwd();

    // 1. Vault check
    if (!isMaencofVault(cwd)) return { continue: true };

    // 2. Config check — opt-in only
    const config = readVaultCommitConfig(cwd);
    if (!config || !config.enabled) return { continue: true };

    // 0. Event gate — for UserPromptSubmit, consult configurable skip patterns
    //    (Y3). Config is read first so user-provided `skip_patterns` govern
    //    the trigger; absent or empty config falls back to `/clear`.
    if (event === 'UserPromptSubmit') {
      const prompt = input.prompt ?? '';
      if (!shouldCommitOnPrompt(prompt, config)) return { continue: true };
    }

    // 3. Git repo check
    if (!(await isGitRepo(cwd))) return { continue: true };

    // 4. Index lock check
    const gitRoot = await getGitRoot(cwd);
    if (!gitRoot || isIndexLocked(gitRoot)) return { continue: true };

    // 5. Scoped vault changes check
    const scope = config.scope ?? DEFAULT_COMMIT_SCOPE;
    if (!(await hasVaultChanges(cwd, scope))) return { continue: true };

    // 6. Stage; nothing staged (e.g. sensitive-only changes) -> nothing to commit
    await stageVaultChanges(cwd, scope);
    const staged = await listStagedFiles(cwd);
    if (staged.length === 0) return { continue: true };

    // 7. Daily fold first; fall back to a plain commit
    if (
      config.fold_daily !== false &&
      (await tryFoldCommit(cwd, scope, config.message_template))
    )
      return { continue: true };
    await commitStaged(
      cwd,
      generateCommitMessage(
        stagedTopLevels(staged, scope),
        staged.length,
        config.message_template,
      ),
    );
  } catch (e) {
    const cwd = input.cwd ?? process.cwd();
    appendErrorLogSafe(cwd, {
      hook: 'vault-committer',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  return { continue: true };
}
