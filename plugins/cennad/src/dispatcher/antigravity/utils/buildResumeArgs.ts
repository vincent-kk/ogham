import type {
  AntigravityFlags,
  DispatchResumeOptions,
} from '../../../types/index.js';

import { printTimeout } from './printTimeout.js';

const CONVERSATION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A session started after agy began exposing its conversation id resumes that
// exact conversation. Sessions recorded before it hold the isolated cwd as their
// ref and keep resuming through --continue, which picks the most recent
// conversation in that directory — the reason the cwd isolation exists.
function targetArgs(externalSessionRef: string): string[] {
  const ref = externalSessionRef.trim();
  return CONVERSATION_ID_RE.test(ref)
    ? ['--conversation', ref]
    : ['--continue'];
}

export function buildResumeArgs(
  args: DispatchResumeOptions<AntigravityFlags>,
  model: string | null,
): string[] {
  const argv = [
    ...targetArgs(args.externalSessionRef),
    '-p',
    args.prompt,
    '--output-format',
    'stream-json',
  ];
  if (args.flags.sandbox) argv.push('--sandbox');
  if (args.flags.skip_permissions) argv.push('--dangerously-skip-permissions');
  if (model) argv.push(`--model=${model}`);
  argv.push('--print-timeout', printTimeout(args.hardCapMs));
  return argv;
}
