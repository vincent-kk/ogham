import type {
  DirectoryRuleTarget,
  SectionArtifactTarget,
} from '@ogham/agent-artifacts/targets';

/**
 * The one address a rule target writes to, whichever shape it has.
 *
 * Claude reads a directory of files and Codex a single instruction file, so
 * "the channel" is a directory in one case and a file in the other. Callers
 * that only need to name it should not have to know which.
 *
 * @param target A resolved rule target for either host.
 * @returns Absolute path to the directory or file that holds the documents.
 */
export function ruleChannelPath(
  target: DirectoryRuleTarget | SectionArtifactTarget,
): string {
  return target.kind === 'directory'
    ? target.directoryPath
    : target.effectivePath;
}
