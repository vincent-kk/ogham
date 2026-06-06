import type {
  AntigravityFlags,
  DispatchOptions,
} from '../../../types/index.js';

export function buildStartArgs(
  args: DispatchOptions<AntigravityFlags>,
  model: string | null,
): string[] {
  const argv = ['-p', args.prompt, '--output-format', 'json'];
  if (args.flags.sandbox) argv.push('--sandbox');
  if (args.flags.skip_permissions) argv.push('--dangerously-skip-permissions');
  if (model) argv.push('-m', model);
  return argv;
}
