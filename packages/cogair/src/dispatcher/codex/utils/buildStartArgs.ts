import type { CodexFlags, DispatchOptions } from '../../../types/index.js';
import { resolveCodexModel } from '../operations/modelAlias.js';

export function buildStartArgs(args: DispatchOptions<CodexFlags>): string[] {
  const argv = ['exec', '--skip-git-repo-check', '--json'];
  if (args.flags.yolo) {
    argv.push('--yolo');
  } else if (args.flags.sandbox !== 'off') {
    argv.push('--sandbox', args.flags.sandbox);
  }
  const model = resolveCodexModel(args.model);
  if (model) argv.push('-m', model);
  argv.push(args.prompt);
  return argv;
}
