import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { PLUGIN_NAME } from '../../constants/plugin.js';
import { ToolName } from '../../constants/toolNames.js';
import { VERSION } from '../../version.js';
import { handleOpenSettings } from '../tools/openSettings/index.js';
import { handleRuleDocsSync } from '../tools/ruleDocsSync/index.js';

import { wrapHandler } from './wrapHandler.js';

/**
 * Assemble the seiri MCP server.
 *
 * Two tools, both about state: which rules are deployed, and where the
 * dial sits. There is deliberately no tool for reading, searching or
 * analysing code — the harness already provides those, and every schema
 * registered here is context spent on every turn whether called or not.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: PLUGIN_NAME, version: VERSION });

  server.registerTool(
    ToolName.OPEN_SETTINGS,
    {
      description:
        'Open the local seiri settings page (rule selection + intervention dial) in a browser and wait for the user to save. Returns status: saved (summary included) | closed (nothing changed) | pending (wait elapsed, page still open — call again to keep waiting).',
      inputSchema: {
        path: z
          .string()
          .optional()
          .describe('Absolute path of the target workspace root.'),
        waitSeconds: z
          .number()
          .optional()
          .describe('Bounded wait for the save event (default 300, max 600).'),
      },
    },
    wrapHandler(handleOpenSettings),
  );

  server.registerTool(
    ToolName.RULE_DOCS_SYNC,
    {
      description:
        'Headless fallback for the seiri setup skill: inspect or reconcile `.claude/rules/seiri_*.md`. Actions: status (what is deployed now) | manifest (what ships) | plan (dry-run a selection, writes nothing) | sync (apply it). Prefer open_settings when a browser is available. Never call from a session hook.',
      inputSchema: {
        action: z
          .enum(['status', 'manifest', 'plan', 'sync'])
          .describe('plan previews the same change sync would apply.'),
        project_root: z
          .string()
          .optional()
          .describe('Absolute path of the target workspace root.'),
        selections: z
          .record(z.string(), z.boolean())
          .nullish()
          .describe(
            'Rule id to opt-in flag; required for plan and sync. An id left out counts as opted out, which removes its deployed file.',
          ),
        resync: z
          .array(z.string())
          .nullish()
          .describe(
            'Rule ids whose local edits may be discarded. Drifted rules not listed here keep their edits and are reported instead.',
          ),
      },
    },
    wrapHandler(handleRuleDocsSync),
  );

  return server;
}
