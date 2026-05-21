import type { DispatchOptions } from '../../../types/index.js';
import { resolveCodexModel } from '../operations/modelAlias.js';

export function buildStartArgs(args: DispatchOptions): string[] {
  const argv = [
    'exec',
    '--skip-git-repo-check',
    '--ask-for-approval',
    'never',
    '--sandbox',
    'read-only',
  ];
  const model = resolveCodexModel(args.model);
  if (model) argv.push('-m', model);
  argv.push(args.prompt);
  return argv;
}
