import type {
  DirectoryRuleTarget,
  SectionArtifactTarget,
} from '@ogham/agent-artifacts';

/**
 * Absolute path of the channel a resolved rule target writes into.
 *
 * @param target A rule target for one layer, as `resolveSeiriRuleTarget`
 *   returns it.
 * @returns The directory a Claude host fills with one file per rule, or the
 *   instruction file a Codex host writes its owned section into.
 */
export function ruleChannelPath(
  target: DirectoryRuleTarget | SectionArtifactTarget,
): string {
  return target.kind === 'directory'
    ? target.directoryPath
    : target.effectivePath;
}
