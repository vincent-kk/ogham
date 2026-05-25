/**
 * @file claudeMd.ts
 * @description Registers 3 CLAUDE.md tools: claudemd_merge / claudemd_read / claudemd_remove.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { CLAUDE_MD_RELATIVE_PATH } from '../../../constants/claude-md.js';
import { handleClaudeMdMerge } from '../../tools/claudemd-merge/index.js';
import { handleClaudeMdRead } from '../../tools/claudemd-read/index.js';
import { handleClaudeMdRemove } from '../../tools/claudemd-remove/index.js';
import { registerMutateTool, registerReadTool } from '../middlewares/index.js';

export function registerClaudeMdTools(server: McpServer): void {
  // ─── claudemd_merge (mutate) ───────────────────────────────────────
  registerMutateTool(
    server,
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
      description:
        'Removes the maencof directive section from CLAUDE.md at CWD.',
      inputSchema: z.object({
        dry_run: z
          .boolean()
          .optional()
          .describe('Dry run mode (default false)'),
      }),
    },
    async (vaultPath, args) => handleClaudeMdRemove(vaultPath, args),
    () => CLAUDE_MD_RELATIVE_PATH,
  );
}
