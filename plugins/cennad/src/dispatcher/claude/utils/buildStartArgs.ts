import type {
  ClaudeFlags,
  ClaudeModelMap,
  DispatchOptions,
} from '../../../types/index.js';
import type { ResolvedClaudeTier } from '../operations/resolveTier.js';

// claude -p <prompt> --output-format json --session-id <id> --permission-mode <m>
//   --model <model> [--effort <e>] [--fallback-model <chain>]
//   --strict-mcp-config --safe-mode
//
// --session-id injects the cennad sessionId so externalSessionRef = sessionId
// without parsing output. --strict-mcp-config + --safe-mode isolate the child
// from the parent Claude session's MCP servers, hooks, CLAUDE.md, and skills.
export function buildStartArgs(
  args: DispatchOptions<ClaudeFlags, ClaudeModelMap>,
  resolved: ResolvedClaudeTier,
): string[] {
  const argv = [
    '-p',
    args.prompt,
    '--output-format',
    'json',
    '--session-id',
    args.sessionId,
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
