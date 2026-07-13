import type {
  CodexFlags,
  CodexModelMap,
  DispatchResumeOptions,
} from '../../../types/index.js';
import type { ResolvedCodexTier } from '../operations/resolveTier.js';

export function buildResumeArgs(
  args: DispatchResumeOptions<CodexFlags, CodexModelMap>,
  resolved: ResolvedCodexTier,
): string[] {
  // --skip-git-repo-check is required on resume too: without it codex refuses to
  // run in a directory it has not recorded as trusted, so a session started fine
  // would fail to continue.
  const argv = ['exec', 'resume', '--skip-git-repo-check', '--json'];
  if (resolved.model) argv.push('-m', resolved.model);
  if (resolved.effort)
    argv.push('-c', `model_reasoning_effort=${resolved.effort}`);
  argv.push(args.externalSessionRef, args.prompt);
  return argv;
}
