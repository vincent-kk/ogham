/**
 * @file activity.ts
 * @description Registers the activity_read plain-read tool.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { handleActivityRead } from '../../tools/activityRead/index.js';
import { registerReadTool } from '../middlewares/index.js';

export function registerActivityReadTools(server: McpServer): void {
  registerReadTool(
    server,
    'activity_read',
    {
      description:
        'Queries the activity log (daily record of vault actions). Supports date, category filter, and last N days lookup. Returns time-ordered entries with category and source path; render to the user as a date-grouped markdown table with Time/Category/Activity/Path columns.',
      inputSchema: z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Date to query YYYY-MM-DD (default: today)'),
        category: z
          .enum(['document', 'search', 'index', 'config', 'diagnostic'])
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
    async (vaultPath, args) =>
      Promise.resolve(handleActivityRead(vaultPath, args)),
    { needsFreshness: false },
  );
}
