import type { DispatchResumeOptions } from '../../../types/index.js';
import { resolveCodexModel } from '../modelAlias.js';

export function buildResumeArgs(args: DispatchResumeOptions): string[] {
  const argv = ['exec', 'resume'];
  const model = resolveCodexModel(args.model);
  if (model) argv.push('-m', model);
  argv.push(args.externalSessionRef, args.prompt);
  return argv;
}
