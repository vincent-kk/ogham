import type {
  CodexFlags,
  DispatchResumeOptions,
} from '../../../types/index.js';
import { resolveCodexModel } from '../operations/modelAlias.js';

export function buildResumeArgs(
  args: DispatchResumeOptions<CodexFlags>,
): string[] {
  const argv = ['exec', 'resume', '--json'];
  const model = resolveCodexModel(args.model);
  if (model) argv.push('-m', model);
  argv.push(args.externalSessionRef, args.prompt);
  return argv;
}
