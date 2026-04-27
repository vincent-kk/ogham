/**
 * @file register-metadata-tools.ts
 * @description Registers 5 metadata tools via the wrapper organ:
 * 2 mutate (claudemd_merge, claudemd_remove) + 3 plain reads (claudemd_read,
 * dailynote_read, context_cache_manage).
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { handleClaudeMdMerge } from '../tools/claudemd-merge/index.js';
import { handleClaudeMdRead } from '../tools/claudemd-read/index.js';
import { handleClaudeMdRemove } from '../tools/claudemd-remove/index.js';
import {
  contextCacheManageInputSchema,
  handleContextCacheManage,
} from '../tools/context-cache-manage/index.js';
import { handleDailynoteRead } from '../tools/dailynote-read/index.js';

import {
  registerMutateTool,
  registerReadTool,
} from './middlewares/index.js';

const CLAUDE_MD_RELATIVE_PATH = 'CLAUDE.md';

export function registerClaudeMdTools(server: McpServer): void {
  // ─── claudemd_merge (mutate) ───────────────────────────────────────
  registerMutateTool(
    server,
    'claudemd_merge',
    {
      description:
        'Inserts or updates the maencof directive section in CLAUDE.md at CWD. Section managed via markers (MAENCOF:START/END).',
      inputSchema: z.object({
        content: z.string().describe(
          'maencof directive to insert into CLAUDE.md (markdown)',
        ),
        dry_run: z.boolean().optional().describe('Dry run mode (default false)'),
      }),
    },
    async (vaultPath, args) => handleClaudeMdMerge(vaultPath, args),
    () => CLAUDE_MD_RELATIVE_PATH,
  );

  // ─── claudemd_read (plain read) ────────────────────────────────────
  registerReadTool(
    server,
    'claudemd_read',
    {
      description: 'Reads the maencof directive section from CLAUDE.md at CWD.',
      inputSchema: z.object({}),
    },
    async (vaultPath) => handleClaudeMdRead(vaultPath),
    { needsFreshness: false },
  );

  // ─── claudemd_remove (mutate) ──────────────────────────────────────
  registerMutateTool(
    server,
    'claudemd_remove',
    {
      description: 'Removes the maencof directive section from CLAUDE.md at CWD.',
      inputSchema: z.object({
        dry_run: z.boolean().optional().describe('Dry run mode (default false)'),
      }),
    },
    async (vaultPath, args) => handleClaudeMdRemove(vaultPath, args),
    () => CLAUDE_MD_RELATIVE_PATH,
  );
}

export function registerDailynoteTools(server: McpServer): void {
  registerReadTool(
    server,
    'dailynote_read',
    {
      description:
        'Queries the dailynote (daily activity log). Supports date, category filter, and last N days lookup. Returns time-grouped entries with category and source path; render to the user as a date-grouped markdown table with Time/Category/Activity/Path columns.',
      inputSchema: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe(
          'Date to query YYYY-MM-DD (default: today)',
        ),
        category: z
          .enum([
            'document',
            'search',
            'index',
            'config',
            'session',
            'diagnostic',
          ])
          .optional()
          .describe('Category filter'),
        last_days: z.number().int().min(1).max(30).optional().describe(
          'Query last N days (default 1, max 30)',
        ),
      }),
    },
    async (vaultPath, args) => Promise.resolve(handleDailynoteRead(vaultPath, args)),
    { needsFreshness: false },
  );
}

export function registerCacheTools(server: McpServer): void {
  registerReadTool(
    server,
    'context_cache_manage',
    {
      description:
        'Manage the turn context injection cache. Pin/unpin nodes for persistent inclusion in turn context, force-refresh the cache, or list current cache state.',
      inputSchema: z.object(contextCacheManageInputSchema),
    },
    async (vaultPath, args) => handleContextCacheManage(vaultPath, args),
    { needsFreshness: false },
  );
}
