/**
 * @file cache-updater.ts
 * @description PostToolUse hook — Refreshes turn-context cache after KG mutations.
 * Runs AFTER index-invalidator (which updates stale-nodes.json) so the rebuilt
 * turn context reflects the latest stale count.
 */
import { writeTurnContext } from '../cache-manager/cache-manager.js';
import { MAENCOF_MCP_TOOLS, isMaencofVault } from '../shared/shared.js';
import { buildTurnContext } from '../turn-context-builder/turn-context-builder.js';

export interface PostToolUseInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  cwd?: string;
}

export interface PostToolUseResult {
  continue: boolean;
}

/**
 * PostToolUse hook handler.
 * Rebuilds the turn-context cache file when a KG mutation tool fires.
 */
export function runCacheUpdater(input: PostToolUseInput): PostToolUseResult {
  const cwd = input.cwd ?? process.cwd();
  const toolName = input.tool_name ?? '';

  // Gate 1: skip if not a maencof vault
  if (!isMaencofVault(cwd)) {
    return { continue: true };
  }

  // Gate 2: skip if tool is not a KG mutation tool
  if (!MAENCOF_MCP_TOOLS.has(toolName)) {
    return { continue: true };
  }

  // Rebuild turn context from current vault state
  try {
    const turnContext = buildTurnContext(cwd);
    writeTurnContext(cwd, turnContext);
  } catch {
    // Silent — cache update failure must not block PostToolUse pipeline
  }

  return { continue: true };
}
