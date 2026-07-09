export { runGit } from './runner/runGit.js';
export { isGitRepo } from './repo/isGitRepo.js';
export { getGitRoot } from './repo/getGitRoot.js';
export { isIndexLocked } from './repo/isIndexLocked.js';
export { hasVaultChanges } from './staging/hasVaultChanges.js';
export { stageVaultChanges } from './staging/stageVaultChanges.js';
export { listStagedFiles } from './staging/listStagedFiles.js';
export { commitStaged } from './staging/commitStaged.js';
export { stagedTopLevels } from './message/stagedTopLevels.js';
export { templateStaticPrefix } from './message/templateStaticPrefix.js';
export {
  generateCommitMessage,
  MESSAGE_TEMPLATE_REPLACERS,
} from './message/generateCommitMessage.js';
export type { CommitMessageContext } from './message/generateCommitMessage.js';
