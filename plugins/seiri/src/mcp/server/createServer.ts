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
        'Headless fallback for the seiri setup skill, plus the intervention dial. Rule actions: status (what is deployed now) | manifest (what ships) | plan (dry-run a selection, writes nothing) | sync (apply it) — prefer open_settings when a browser is available. Dial action: config (read the dial, or turn the session valve up/down for this checkout). Never call from a session hook.',
      inputSchema: {
        action: z
          .enum(['status', 'manifest', 'plan', 'sync', 'config'])
          .describe(
            'plan previews the same change sync would apply. config reads or moves the intervention dial and touches no rule file.',
          ),
        project_root: z
          .string()
          .optional()
          .describe('Absolute path of the target workspace root.'),
        config_op: z
          .enum(['get', 'set', 'clear'])
          .nullish()
          .describe(
            'For action "config", default get. set stores an untracked session valve that overrides the committed baseline; clear drops it so the baseline applies again. Neither writes the committed baseline — that stays a setup-surface act.',
          ),
        intervention: z
          .enum(['advisory', 'standard', 'strict'])
          .nullish()
          .describe(
            'Dial position for config_op "set". advisory silences every conditional signal seiri injects; standard announces the workflow chain; strict also widens borderline moments and puts a verification run behind completion claims.',
          ),
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
