/**
 * @file dailynote.ts
 * @description Registers the dailynote_read plain-read tool.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { handleDailynoteRead } from '../../tools/dailynote-read/index.js';

import { registerReadTool } from '../middlewares/index.js';

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
