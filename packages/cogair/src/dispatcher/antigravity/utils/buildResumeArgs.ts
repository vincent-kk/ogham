import type {
  AntigravityFlags,
  DispatchResumeOptions,
} from '../../../types/index.js';

export function buildResumeArgs(
  args: DispatchResumeOptions<AntigravityFlags>,
  model: string | null,
): string[] {
  // agy has no headless conversation-id resume (Issue #7); --continue resumes
  // the most recent conversation in the session-isolated cwd, so cwd identity
  // == session identity.
  const argv = ['--continue', '-p', args.prompt, '--output-format', 'json'];
  if (args.flags.sandbox) argv.push('--sandbox');
  if (args.flags.skip_permissions) argv.push('--dangerously-skip-permissions');
  if (model) argv.push('-m', model);
  return argv;
}
