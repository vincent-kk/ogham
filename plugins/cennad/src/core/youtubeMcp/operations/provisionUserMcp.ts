import {
  type McpCliRunResult,
  type McpCliRunner,
  createMcpServerManager,
  resolveUserMcpTarget,
} from '@ogham/agent-artifacts';

import { logger } from '../../../lib/logger.js';
import type { YoutubeAddonLanguage } from '../../../types/index.js';
import {
  YOUTUBE_MCP_ARGS,
  YOUTUBE_MCP_COMMAND,
  YOUTUBE_MCP_KEY,
  youtubeMcpEnv,
} from '../constants/youtubeServer.js';

import type { ProvisionResult } from './provisionResult.js';

export type YoutubeUserMcpHost = 'codex' | 'claude';
export type UserMcpRunner = McpCliRunner;
export type UserMcpRunResult = McpCliRunResult;

// Reconciles a user-scoped CLI MCP through the shared artifact manager. Cennad
// owns only the desired yt-dlp definition and its logging/degrade policy.
export async function provisionUserMcpYoutube(
  host: YoutubeUserMcpHost,
  enabled: boolean,
  language: YoutubeAddonLanguage,
  run?: UserMcpRunner,
): Promise<ProvisionResult> {
  try {
    const mcp = createMcpServerManager({
      owner: 'cennad',
      target: resolveUserMcpTarget({ host }),
    });
    const plan = await mcp.plan({
      name: YOUTUBE_MCP_KEY,
      definition: enabled
        ? {
            transport: 'stdio',
            command: YOUTUBE_MCP_COMMAND,
            args: YOUTUBE_MCP_ARGS,
            env: youtubeMcpEnv(language),
          }
        : null,
      replaceDrift: true,
    });
    const result = await mcp.apply(
      plan,
      run === undefined ? undefined : { runner: run },
    );
    if (!result.ok) {
      if (result.failure?.kind !== 'not-installed')
        logger.warn(`${host} youtube MCP provisioning failed`, {
          code: result.failure?.code ?? null,
          stderr: result.failure?.stderr.slice(0, 200) ?? '',
        });

      return { ok: false, action: 'unchanged' };
    }
    return { ok: true, action: enabled ? 'added' : 'removed' };
  } catch (err) {
    logger.warn(`${host} youtube MCP provisioning threw`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, action: 'unchanged' };
  }
}
