import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  ModelAliasSchema,
  ProviderSchema,
} from '../../../types/conversation.js';
import { VERSION } from '../../../version.js';
import { wrapHandler } from '../../shared/index.js';
import { handleContinueConversation } from '../../tools/continueConversation/index.js';
import { handleListAntigravityModels } from '../../tools/listModels/index.js';
import { handleOpenSettings } from '../../tools/openSettings/index.js';
import { handleStartConversation } from '../../tools/startConversation/index.js';

export function createServer(): McpServer {
  const server = new McpServer({ name: 'tools', version: VERSION });

  server.registerTool(
    'start_conversation',
    {
      description:
        'Delegate a prompt to an external LLM CLI (codex = code/shell; gemini or antigravity = web research & ' +
        'large context) and return its answer plus a session_id for follow-ups. ' +
        'The CLI cannot see this Claude conversation — make the prompt self-contained.',
      inputSchema: {
        provider: ProviderSchema.describe(
          "'codex' (OpenAI): code-heavy or sandboxed-shell work. 'gemini'/'antigravity' (Google): live web " +
            'research, large-context synthesis. gemini and antigravity are mutually exclusive — dispatch to whichever is enabled.',
        ),
        prompt: z
          .string()
          .min(1)
          .describe(
            'Self-contained prompt; the CLI has no access to this conversation, the repo, or prior turns.',
          ),
        model: ModelAliasSchema.describe(
          'Capability tier (high/mid/low, or auto = CLI default). Omit to use the configured default.',
        ).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    wrapHandler(handleStartConversation),
  );

  server.registerTool(
    'continue_conversation',
    {
      description:
        'Continue an external LLM session by session_id, keeping its original provider and model. ' +
        'The session_id must come from a start_conversation in the SAME working directory — sessions are ' +
        'project-scoped, so one from elsewhere returns error.code "unknown".',
      inputSchema: {
        session_id: z
          .string()
          .uuid()
          .describe(
            'UUID returned by a prior start_conversation in this same working directory.',
          ),
        prompt: z
          .string()
          .min(1)
          .describe(
            'Follow-up message; the CLI keeps its own prior turns but still cannot see this Claude conversation.',
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    wrapHandler(handleContinueConversation),
  );

  server.registerTool(
    'open_settings',
    {
      description:
        'Open the cogair settings UI in a local browser to configure provider ratio, intervention strength, ' +
        'routing keywords, defaults, and permission flags. No arguments; returns a localhost URL.',
      inputSchema: {},
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    wrapHandler(handleOpenSettings),
  );

  server.registerTool(
    'list_antigravity_models',
    {
      description:
        'List the Antigravity (agy) model full-names currently available to your account — use this before an ' +
        'auto-tier antigravity dispatch to pick a model, or to see which models the tier mapping can target. ' +
        'Returns { models: string[] } (empty if agy is not installed or not authenticated).',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleListAntigravityModels),
  );

  return server;
}
