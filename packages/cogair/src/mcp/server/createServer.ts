import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  ConversationOptionsSchema,
  ModelAliasSchema,
  ProviderSchema,
} from '../../types/conversation.js';
import { VERSION } from '../../version.js';
import { wrapHandler } from '../shared/index.js';
import { handleContinueConversation } from '../tools/continueConversation/index.js';
import { handleOpenSettings } from '../tools/openSettings/index.js';
import { handleStartConversation } from '../tools/startConversation/index.js';

export function createServer(): McpServer {
  const server = new McpServer({ name: 'tools', version: VERSION });

  server.registerTool(
    'start_conversation',
    {
      description: 'Start a new external LLM session via gemini or codex CLI.',
      inputSchema: {
        provider: ProviderSchema,
        prompt: z.string().min(1),
        model: ModelAliasSchema.optional(),
        options: ConversationOptionsSchema.optional(),
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
      description: 'Continue an existing external LLM session by session_id.',
      inputSchema: {
        session_id: z.string().uuid(),
        prompt: z.string().min(1),
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
        'Open the cogair settings UI in a local browser (Phase 4 placeholder).',
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
