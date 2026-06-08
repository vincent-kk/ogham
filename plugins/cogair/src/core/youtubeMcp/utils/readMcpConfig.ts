import { readFile } from 'node:fs/promises';

import { isFileNotFound } from '../../../utils/isFileNotFound.js';

// agy's mcp_config.json shape (only `mcpServers` is meaningful to cogair). Other
// top-level keys are preserved verbatim on write so cogair never clobbers fields
// agy or the user added.
export interface McpConfigDocument {
  mcpServers: Record<string, unknown>;
  [key: string]: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// Reads and normalizes agy's mcp_config.json. A missing file or a malformed
// `mcpServers` section degrades to an empty registry rather than throwing, so a
// first-time provision starts from a clean `{ mcpServers: {} }`.
export async function readMcpConfig(path: string): Promise<McpConfigDocument> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    if (isFileNotFound(err)) return { mcpServers: {} };
    throw err;
  }

  const parsed = asRecord(JSON.parse(raw) as unknown);
  if (parsed === null) return { mcpServers: {} };

  return { ...parsed, mcpServers: asRecord(parsed.mcpServers) ?? {} };
}
