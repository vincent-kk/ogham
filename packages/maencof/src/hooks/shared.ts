/**
 * @file shared.ts
 * @description Shared utilities for maencof hooks — vault detection, meta path helpers
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** maencof meta directory name */
export const MAENCOF_META_DIR = '.maencof-meta';
/** maencof index directory name */
export const MAENCOF_DIR = '.maencof';
// isLayer1Path, LAYER1_PREFIX: moved to types/layer.ts — re-exported for backward compatibility
export { LAYER1_PREFIX, isLayer1Path } from '../types/layer.js';

/**
 * Check whether the current working directory is a maencof vault.
 * Determined by the presence of .maencof/ or .maencof-meta/ directories.
 */
export function isMaencofVault(cwd: string): boolean {
  return (
    existsSync(join(cwd, MAENCOF_DIR)) ||
    existsSync(join(cwd, MAENCOF_META_DIR))
  );
}

/**
 * Return a path under the maencof meta directory.
 */
export function metaPath(cwd: string, ...segments: string[]): string {
  return join(cwd, MAENCOF_META_DIR, ...segments);
}

/**
 * Return a path under the maencof index directory.
 */
export function maencofPath(cwd: string, ...segments: string[]): string {
  return join(cwd, MAENCOF_DIR, ...segments);
}

/**
 * Read JSON input from stdin.
 */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Write the hook result to stdout.
 */
export function writeResult(result: unknown): void {
  process.stdout.write(JSON.stringify(result));
}

/**
 * Set of maencof MCP tool names.
 * SYNC: Must stay in sync with hooks/hooks.json PostToolUse.matcher
 *
 * Excluded tools: maencof_read, kg_search, kg_navigate, kg_context, kg_status have no
 * write side effects. kg_build writes to .maencof/ (index rebuild) but is excluded because
 * it clears stale-nodes on completion — tracking it here would be contradictory.
 * hooks.json PostToolUse.matcher must contain the same set.
 */
export const MAENCOF_MCP_TOOLS = new Set([
  'maencof_create',
  'maencof_update',
  'maencof_delete',
  'maencof_move',
]);
