/**
 * @file register-metadata-tools.ts
 * @description Registers 5 metadata tools: claudemd_merge, claudemd_read, claudemd_remove, dailynote_read, context_cache_manage
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolError, toolResult } from '../shared/index.js';
import { handleClaudeMdMerge } from '../tools/claudemd-merge/index.js';
import { handleClaudeMdRead } from '../tools/claudemd-read/index.js';
import { handleClaudeMdRemove } from '../tools/claudemd-remove/index.js';
import {
  contextCacheManageInputSchema,
  handleContextCacheManage,
} from '../tools/context-cache-manage/index.js';
import { handleDailynoteRead } from '../tools/dailynote-read/index.js';

import { getVaultPath } from './graph-cache.js';

export function registerClaudeMdTools(server: McpServer): void {
  // ─── claudemd_merge ───────────────────────────────────────────────
  server.registerTool(
    'claudemd_merge',
    {
      description:
        'Inserts or updates the maencof directive section in CLAUDE.md at CWD. Section managed via markers (MAENCOF:START/END).',
      inputSchema: z.object({
        content: z
          .string()
          .describe('maencof directive to insert into CLAUDE.md (markdown)'),
        dry_run: z
          .boolean()
          .optional()
          .describe('Dry run mode (default false)'),
      }),
    },
    (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = handleClaudeMdMerge(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── claudemd_read ────────────────────────────────────────────────
  server.registerTool(
    'claudemd_read',
    {
      description: 'Reads the maencof directive section from CLAUDE.md at CWD.',
      inputSchema: z.object({}),
    },
    (_args) => {
      try {
        const vaultPath = getVaultPath();
        const result = handleClaudeMdRead(vaultPath);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── claudemd_remove ──────────────────────────────────────────────
  server.registerTool(
    'claudemd_remove',
    {
      description:
        'Removes the maencof directive section from CLAUDE.md at CWD.',
      inputSchema: z.object({
        dry_run: z
          .boolean()
          .optional()
          .describe('Dry run mode (default false)'),
      }),
    },
    (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = handleClaudeMdRemove(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

export function registerDailynoteTools(server: McpServer): void {
  server.registerTool(
    'dailynote_read',
    {
      description:
        'Queries the dailynote (daily activity log). Supports date, category filter, and last N days lookup.',
      inputSchema: z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Date to query YYYY-MM-DD (default: today)'),
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
        last_days: z
          .number()
          .int()
          .min(1)
          .max(30)
          .optional()
          .describe('Query last N days (default 1, max 30)'),
      }),
    },
    (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = handleDailynoteRead(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

export function registerCacheTools(server: McpServer): void {
  server.registerTool(
    'context_cache_manage',
    {
      description:
        'Manage the turn context injection cache. Pin/unpin nodes for persistent inclusion in turn context, force-refresh the cache, or list current cache state.',
      inputSchema: z.object(contextCacheManageInputSchema),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleContextCacheManage(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
