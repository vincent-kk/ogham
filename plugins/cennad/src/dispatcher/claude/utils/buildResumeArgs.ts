import type {
  ClaudeFlags,
  ClaudeModelMap,
  DispatchResumeOptions,
} from '../../../types/index.js';
import type { ResolvedClaudeTier } from '../operations/resolveTier.js';

// claude -p <prompt> --output-format json --resume <ref> --permission-mode <m>
//   --model <model> [--effort <e>] [--fallback-model <chain>]
//   --strict-mcp-config --safe-mode
//
// <ref> is the externalSessionRef recorded at start (the cennad sessionId).
// Isolation flags are always attached, exactly as on start.
export function buildResumeArgs(
  args: DispatchResumeOptions<ClaudeFlags, ClaudeModelMap>,
  resolved: ResolvedClaudeTier,
): string[] {
  const argv = [
    '-p',
    args.prompt,
    '--output-format',
    'json',
    '--resume',
    args.externalSessionRef,
    '--permission-mode',
    args.flags.permission_mode,
    '--model',
    resolved.model,
  ];
  if (resolved.effort) argv.push('--effort', resolved.effort);
  if (args.flags.fallback_model)
    argv.push('--fallback-model', args.flags.fallback_model);
  argv.push('--strict-mcp-config', '--safe-mode');
  return argv;
}
