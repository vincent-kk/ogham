import type {
  CodexFlags,
  CodexModelMap,
  DispatchOptions,
} from '../../../types/index.js';
import type { ResolvedCodexTier } from '../operations/resolveTier.js';

export function buildStartArgs(
  args: DispatchOptions<CodexFlags, CodexModelMap>,
  resolved: ResolvedCodexTier,
): string[] {
  const argv = ['exec', '--skip-git-repo-check', '--json'];
  if (args.flags.yolo) argv.push('--yolo');
  else if (args.flags.sandbox !== 'off')
    argv.push('--sandbox', args.flags.sandbox);

  if (resolved.model) argv.push('-m', resolved.model);
  if (resolved.effort)
    argv.push('-c', `model_reasoning_effort=${resolved.effort}`);
  argv.push(args.prompt);
  return argv;
}
