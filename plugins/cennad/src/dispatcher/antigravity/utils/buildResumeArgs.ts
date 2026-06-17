import type {
  AntigravityFlags,
  DispatchResumeOptions,
} from '../../../types/index.js';

export function buildResumeArgs(
  args: DispatchResumeOptions<AntigravityFlags>,
  model: string | null,
): string[] {
  const argv = ['--continue', '-p', args.prompt];
  // Disabled while agy #76 (non-TTY output drop) is unfixed; restore when agy
  // ships a fix: if (args.flags.sandbox) argv.push('--sandbox');
  if (args.flags.skip_permissions) argv.push('--dangerously-skip-permissions');
  if (model) argv.push(`--model=${model}`);
  return argv;
}
