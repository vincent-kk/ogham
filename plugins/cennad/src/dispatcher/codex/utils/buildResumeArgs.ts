import type {
  CodexFlags,
  DispatchResumeOptions,
} from '../../../types/index.js';
import { resolveCodexEffort } from '../operations/reasoningEffort.js';

export function buildResumeArgs(
  args: DispatchResumeOptions<CodexFlags>,
): string[] {
  const argv = ['exec', 'resume', '--json'];
  const effort = resolveCodexEffort(args.tier);
  if (effort) argv.push('-c', `model_reasoning_effort=${effort}`);
  argv.push(args.externalSessionRef, args.prompt);
  return argv;
}
