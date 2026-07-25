import {
  createMcpServerManager,
  type McpCliRunResult,
  type McpCliRunner,
} from '@ogham/agent-artifacts/mcp';
import { resolveUserMcpTarget } from '@ogham/agent-artifacts/targets/user/mcp';

import { logger } from '../../../lib/logger.js';
import type { YoutubeAddonLanguage } from '../../../types/index.js';
import {
  YOUTUBE_MCP_ARGS,
  YOUTUBE_MCP_COMMAND,
  YOUTUBE_MCP_KEY,
  youtubeMcpEnv,
} from '../constants/youtubeServer.js';

import type { ProvisionResult } from './provisionResult.js';

export type CodexMcpRunner = McpCliRunner;
export type CodexRunResult = McpCliRunResult;

// Reconciles the Codex user MCP through the shared artifact manager. Cennad owns
// only product policy here: the desired yt-dlp definition and its logging/degrade
// behavior. The manager owns argv construction, spawning, and failure classification.
export async function provisionCodexYoutube(
  enabled: boolean,
  language: YoutubeAddonLanguage,
  run?: CodexMcpRunner,
): Promise<ProvisionResult> {
  try {
    const mcp = createMcpServerManager({
      owner: 'cennad',
      target: resolveUserMcpTarget({ host: 'codex' }),
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
        logger.warn('codex youtube MCP provisioning failed', {
          code: result.failure?.code ?? null,
          stderr: result.failure?.stderr.slice(0, 200) ?? '',
        });

      return { ok: false, action: 'unchanged' };
    }
    return { ok: true, action: enabled ? 'added' : 'removed' };
  } catch (err) {
    logger.warn('codex youtube MCP provisioning threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, action: 'unchanged' };
  }
}
