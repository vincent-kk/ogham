import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { McpToolName } from '../../../constants/mcpToolNames.js';
import { ProviderSchema, TierSchema } from '../../../types/conversation.js';
import { VERSION } from '../../../version.js';
import { wrapHandler } from '../../shared/index.js';
import { handleContinueConversation } from '../../tools/continueConversation/index.js';
import { handleOpenSettings } from '../../tools/openSettings/index.js';
import { handleStartConversation } from '../../tools/startConversation/index.js';

export function createServer(): McpServer {
  const server = new McpServer({ name: 'tools', version: VERSION });

  server.registerTool(
    McpToolName.START_CONVERSATION,
    {
      description:
        'Delegate a prompt to an external LLM CLI (codex = code/shell; antigravity = web research & ' +
        'large context) and return its answer plus a session_id for follow-ups. ' +
        'The CLI cannot see this Claude conversation — make the prompt self-contained.',
      inputSchema: {
        provider: ProviderSchema.describe(
          "'codex' (OpenAI): code-heavy or sandboxed-shell work. 'antigravity' (Google): live web " +
            "research, large-context synthesis. A disabled provider returns error.code 'disabled'.",
        ),
        prompt: z
          .string()
          .min(1)
          .describe(
            'Self-contained prompt; the CLI has no access to this conversation, the repo, or prior turns.',
          ),
        tier: TierSchema.optional().describe(
          'Optional capability/cost tier; omit to use the configured default for ' +
            'that provider. Higher is stronger but much more likely to hit ' +
            'rate_limit or budget_exhausted. Use mid as the normal tier for almost ' +
            'all work; low for clearly simple tasks; high only with a specific reason ' +
            'to expect mid will be insufficient — not merely because the task looks complex.',
        ),
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
    McpToolName.CONTINUE_CONVERSATION,
    {
      description:
        'Continue an external LLM session by session_id, keeping its original provider. ' +
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
        tier: TierSchema.optional().describe(
          'Optional capability/cost tier for THIS turn; omit to use the configured ' +
            'default for that provider. Higher is stronger but much more likely to hit ' +
            'rate_limit or budget_exhausted. Use mid for normal work, low for clearly ' +
            'simple tasks; high only with a specific reason to expect mid will be insufficient.',
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
    McpToolName.OPEN_SETTINGS,
    {
      description:
        'Open the cennad settings UI in a local browser to configure provider ratio, intervention strength, ' +
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

  return server;
}
