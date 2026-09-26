import type { Host } from '@ogham/cross-platform';

import {
  CLAUDE_MCP_TOOL_PREFIX,
  CODEX_MCP_TOOL_PREFIX,
} from '../../../../../constants/mcpContracts.js';

/**
 * Spell Filid tool calls in actor-method text the way the reading host resolves them.
 * The server injects the canonical method, written with Claude Code names, into briefs for every host.
 * @param method Canonical actor-method text.
 * @param host Host whose agent reads the rendered brief.
 * @returns The text with Codex tool names for a Codex reader; unchanged for any other host.
 */
export function adaptMethodToolNames(method: string, host: Host): string {
  return host === 'codex'
    ? method.replaceAll(CLAUDE_MCP_TOOL_PREFIX, CODEX_MCP_TOOL_PREFIX)
    : method;
}
