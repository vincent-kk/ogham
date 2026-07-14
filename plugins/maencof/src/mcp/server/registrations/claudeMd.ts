/**
 * @file claudeMd.ts
 * @description Registers 3 instruction-file tools: claudemd_merge / claudemd_read / claudemd_remove.
 *
 * The file itself is host-dependent — Claude reads `CLAUDE.md`, Codex reads `AGENTS.md` —
 * so the side-effect bookkeeping resolves it per call rather than pinning a constant.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { instructionsFile } from '@ogham/cross-platform/host-paths';
import { z } from 'zod';

import { McpToolName } from '../../../constants/mcpToolNames.js';
import { handleClaudeMdMerge } from '../../tools/claudemdMerge/index.js';
import { handleClaudeMdRead } from '../../tools/claudemdRead/index.js';
import { handleClaudeMdRemove } from '../../tools/claudemdRemove/index.js';
import { registerMutateTool, registerReadTool } from '../middlewares/index.js';

export function registerClaudeMdTools(server: McpServer): void {
  // ─── claudemd_merge (mutate) ───────────────────────────────────────
  registerMutateTool(
    server,
    McpToolName.CLAUDEMD_MERGE,
    {
      description:
        "Inserts or updates the maencof directive section in this host's instruction file at CWD (CLAUDE.md on Claude Code, AGENTS.md on Codex). Section managed via markers (MAENCOF:START/END).",
      inputSchema: z.object({
        content: z
          .string()
          .describe(
            "maencof directive to insert into the host's instruction file (markdown)",
          ),
        dry_run: z
          .boolean()
          .optional()
          .describe('Dry run mode (default false)'),
      }),
    },
    async (vaultPath, args) => handleClaudeMdMerge(vaultPath, args),
    () => instructionsFile(),
  );

  // ─── claudemd_read (plain read) ────────────────────────────────────
  registerReadTool(
    server,
    McpToolName.CLAUDEMD_READ,
    {
      description:
        "Reads the maencof directive section from this host's instruction file at CWD (CLAUDE.md on Claude Code, AGENTS.md on Codex).",
      inputSchema: z.object({}),
    },
    async (vaultPath) => handleClaudeMdRead(vaultPath),
    { needsFreshness: false },
  );

  // ─── claudemd_remove (mutate) ──────────────────────────────────────
  registerMutateTool(
    server,
    McpToolName.CLAUDEMD_REMOVE,
    {
      description:
        "Removes the maencof directive section from this host's instruction file at CWD (CLAUDE.md on Claude Code, AGENTS.md on Codex).",
      inputSchema: z.object({
        dry_run: z
          .boolean()
          .optional()
          .describe('Dry run mode (default false)'),
      }),
    },
    async (vaultPath, args) => handleClaudeMdRemove(vaultPath, args),
    () => instructionsFile(),
  );
}
