/**
 * @file index-invalidator.ts
 * @description PostToolUse Hook — Update stale-nodes.json and increment usage stats after maencof MCP tool calls
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import {
  MAENCOF_MCP_TOOLS,
  isMaencofVault,
  maencofPath,
  metaPath,
} from './shared.js';

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
 * Index Invalidator Hook handler.
 * After maencof CRUD tool calls:
 * 1. Add affected nodes to stale-nodes.json
 * 2. Increment usage-stats.json call counts
 */
export function runIndexInvalidator(
  input: PostToolUseInput,
): PostToolUseResult {
  const cwd = input.cwd ?? process.cwd();
  const toolName = input.tool_name ?? '';

  if (!isMaencofVault(cwd) || !MAENCOF_MCP_TOOLS.has(toolName)) {
    return { continue: true };
  }

  // Extract affected node path
  // maencof_update/delete/move: path exists in tool_input
  // maencof_create: no path in tool_input → extract from tool_response
  const affectedPath =
    (input.tool_input?.path as string) ??
    (input.tool_input?.file_path as string) ??
    extractPathFromResponse(input.tool_response) ??
    null;

  // Update stale-nodes.json
  if (affectedPath) {
    appendStaleNode(cwd, affectedPath);
  }

  // Note: maencof_move target path stale tracking is handled by maencof-move.ts handler
  // via mcp/shared.ts appendStaleNode(), so this hook does not duplicate it.
  // Both writers now target the same file: .maencof/stale-nodes.json with StaleNodes format.

  // Increment usage-stats.json counts
  incrementUsageStat(cwd, toolName);

  return { continue: true };
}

/**
 * Append a node path to .maencof/stale-nodes.json (deduplicated).
 * Uses StaleNodes format { paths: string[], updatedAt: string } matching MetadataStore.
 */
function appendStaleNode(cwd: string, nodePath: string): void {
  const stalePath = maencofPath(cwd, 'stale-nodes.json');
  let stale: { paths: string[]; updatedAt: string } = {
    paths: [],
    updatedAt: new Date().toISOString(),
  };

  if (existsSync(stalePath)) {
    try {
      stale = JSON.parse(readFileSync(stalePath, 'utf-8')) as typeof stale;
    } catch {
      stale = { paths: [], updatedAt: new Date().toISOString() };
    }
  }

  if (!stale.paths.includes(nodePath)) {
    stale.paths.push(nodePath);
    stale.updatedAt = new Date().toISOString();
    ensureDir(stalePath);
    writeFileSync(stalePath, JSON.stringify(stale, null, 2), 'utf-8');
  }
}

/**
 * Increment the per-tool call count in usage-stats.json.
 */
function incrementUsageStat(cwd: string, toolName: string): void {
  const statsPath = metaPath(cwd, 'usage-stats.json');
  let stats: Record<string, number> = {};

  if (existsSync(statsPath)) {
    try {
      stats = JSON.parse(readFileSync(statsPath, 'utf-8')) as Record<
        string,
        number
      >;
    } catch {
      stats = {};
    }
  }

  stats[toolName] = (stats[toolName] ?? 0) + 1;
  ensureDir(statsPath);
  writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8');
}

/**
 * Extract MaencofCrudResult.path from MCP tool_response.
 * For tools like maencof_create where path is not in tool_input.
 *
 * Handles two response formats defensively:
 * - Format 1 (Flat): Claude Code strips MCP wrapper { path: string, ... }
 * - Format 2 (MCP wrapper): { content: [{ type: "text", text: JSON.stringify(result) }] }
 */
function extractPathFromResponse(
  response: Record<string, unknown> | undefined,
): string | null {
  if (!response) return null;
  try {
    // Format 1: Flat object (Claude Code may strip MCP wrapper)
    if (typeof response.path === 'string' && response.path) {
      return response.path;
    }
    // Format 2: MCP wrapper { content: [{ type: "text", text: JSON.stringify(result) }] }
    const content = response.content;
    if (Array.isArray(content) && content.length > 0) {
      const first = content[0] as { type?: string; text?: string };
      if (first.type === 'text' && first.text) {
        const parsed = JSON.parse(first.text) as { path?: string };
        if (typeof parsed.path === 'string' && parsed.path) return parsed.path;
      }
    }
  } catch {
    /* ignore parse failures */
  }
  return null;
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
