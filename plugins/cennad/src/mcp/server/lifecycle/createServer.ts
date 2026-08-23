import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PROJECT_ROOT_ARG_DESCRIPTION } from '@ogham/cross-platform';
import { z } from 'zod';

import { McpToolName } from '../../../constants/mcpToolNames.js';
import { ProviderSchema, TierSchema } from '../../../types/conversation.js';
import { wrapHandler } from '../../shared/index.js';
import { handleContinueConversation } from '../../tools/continueConversation/index.js';
import { handleOpenSettings } from '../../tools/openSettings/index.js';
import { handleStartConversation } from '../../tools/startConversation/index.js';
import { handleStopConversation } from '../../tools/stopConversation/index.js';

/**
 * MCP 서버 인스턴스를 만들고 3개 도구를 등록한다.
 *
 * @param version 호스트에 보고할 서버 버전. `src/version.ts` 의 `VERSION` 을
 *   호출자가 넘긴다 — 이 fractal 이 직접 읽으면 `src` 로 되돌아가는 의존 엣지가
 *   생겨 e2e 하네스의 `src → mcp/server` 엣지와 순환을 만든다.
 * @returns 도구가 등록된, 아직 transport 에 연결되지 않은 서버.
 */
export function createServer(version: string): McpServer {
  const server = new McpServer({ name: 'tools', version });

  server.registerTool(
    McpToolName.START_CONVERSATION,
    {
      description:
        'Delegate a self-contained prompt to an external LLM CLI and return its answer and session_id. ' +
        'The CLI can use permitted tools in the working directory but cannot see this conversation.',
      inputSchema: {
        provider: ProviderSchema.describe(
          "'codex': code/shell; 'antigravity': web research/large context; " +
            "'claude': reasoning/writing/review. Disabled providers return error.code 'disabled'.",
        ),
        prompt: z
          .string()
          .min(1)
          .describe(
            'Self-contained prompt. The CLI cannot see this conversation, but may use permitted tools and files in the working directory.',
          ),
        tier: TierSchema.optional().describe(
          'Optional tier; omit for provider default. Prefer high for most work; use low/mid when bounded. ' +
            'Use apex only if high cannot handle exceptional difficulty or tens-of-minutes autonomy; ' +
            'it is slower and limit-prone.',
        ),
        project_root: z
          .string()
          .optional()
          .describe(PROJECT_ROOT_ARG_DESCRIPTION),
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
        'Continue a project-scoped session with its original provider. ' +
        'Use a session_id returned in this working directory.',
      inputSchema: {
        session_id: z
          .string()
          .uuid()
          .describe(
            'Project-scoped UUID returned by start_conversation in this working directory.',
          ),
        prompt: z
          .string()
          .min(1)
          .describe(
            'Follow-up prompt. The CLI keeps its provider history but cannot see this conversation.',
          ),
        tier: TierSchema.optional().describe(
          'Optional override for this turn; omit to keep session tier. Prefer high for most work; ' +
            'use low/mid for bounded work. Use apex only when high cannot handle exceptionally difficult ' +
            'or tens-of-minutes autonomous work.',
        ),
        project_root: z
          .string()
          .optional()
          .describe(PROJECT_ROOT_ARG_DESCRIPTION),
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
    McpToolName.STOP_CONVERSATION,
    {
      description:
        'Provider CLIs outlive their caller. Stop matching runs and child processes immediately; ' +
        'in-progress work is lost. A count of 0 means no running match.',
      inputSchema: {
        session_id: z
          .string()
          .uuid()
          .optional()
          .describe(
            'Stop one session. If an in-flight start has not returned its ID, filter by provider or omit both filters.',
          ),
        provider: ProviderSchema.optional().describe(
          'Stop all running calls for one provider; calls to other providers continue.',
        ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    wrapHandler(handleStopConversation),
  );

  server.registerTool(
    McpToolName.OPEN_SETTINGS,
    {
      description:
        'Open the local cennad settings UI. No arguments; returns a localhost URL.',
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
