/**
 * @file workHistory.ts
 * @description Registers the work_history plain-read tool.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { handleWorkHistory } from '../../tools/workHistory/index.js';
import { registerReadTool } from '../middlewares/index.js';

export function registerWorkHistoryTools(server: McpServer): void {
  registerReadTool(
    server,
    'work_history',
    {
      description:
        'Summarizes work over time from work-history rollups. Default: a period summary (sessions, active days, vault ops, top topics, layers) over the last N days or a from/to range. With `topic` or `layer`, returns when it was last worked on plus its full date history. Render the result to the user as a concise summary.',
      inputSchema: z.object({
        last_days: z
          .number()
          .int()
          .min(1)
          .max(90)
          .optional()
          .describe('Period summary over last N days (default 7, max 90)'),
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Period start YYYY-MM-DD (use with to)'),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Period end YYYY-MM-DD'),
        topic: z
          .string()
          .optional()
          .describe('Topic (file stem) to look up work dates for'),
        layer: z
          .string()
          .optional()
          .describe('Layer dir (e.g. 01_Core) to look up work dates for'),
      }),
    },
    async (vaultPath, args) =>
      Promise.resolve(handleWorkHistory(vaultPath, args)),
    { needsFreshness: false },
  );
}
