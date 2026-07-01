import type { CodexFlags, DispatchOptions } from '../../../types/index.js';
import { resolveCodexEffort } from '../operations/reasoningEffort.js';

export function buildStartArgs(args: DispatchOptions<CodexFlags>): string[] {
  const argv = ['exec', '--skip-git-repo-check', '--json'];
  if (args.flags.yolo) argv.push('--yolo');
  else if (args.flags.sandbox !== 'off')
    argv.push('--sandbox', args.flags.sandbox);

  const effort = resolveCodexEffort(args.tier);
  if (effort) argv.push('-c', `model_reasoning_effort=${effort}`);
  argv.push(args.prompt);
  return argv;
}
