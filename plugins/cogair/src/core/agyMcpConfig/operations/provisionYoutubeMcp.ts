import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { DIR_MODE } from '../../../constants/defaults.js';
import { AGY_MCP_CONFIG_PATH } from '../../../constants/paths.js';
import { atomicWrite } from '../../../lib/atomicWrite.js';
import { logger } from '../../../lib/logger.js';
import {
  ANTIGRAVITY_YOUTUBE_MCP_KEY,
  ANTIGRAVITY_YOUTUBE_MCP_SERVER,
} from '../constants/youtubeServer.js';
import { readMcpConfig } from '../utils/readMcpConfig.js';

export type ProvisionAction = 'added' | 'removed' | 'unchanged';

export interface ProvisionResult {
  ok: boolean;
  action: ProvisionAction;
  path: string;
}

// Idempotently registers (enabled) or unregisters (disabled) the youtube-transcript
// MCP server in agy's global mcp_config.json. Preserves every other server and
// top-level key. An existing youtube-transcript entry is left untouched when
// enabling — cogair never overwrites a server the user configured by hand.
// Never throws: any read/write failure resolves to `{ ok: false }` and a warning,
// so the settings save it backs is never broken by an agy-config problem.
export async function provisionYoutubeMcp(
  enabled: boolean,
  configPath: string = AGY_MCP_CONFIG_PATH,
): Promise<ProvisionResult> {
  try {
    const config = await readMcpConfig(configPath);
    const present = Object.prototype.hasOwnProperty.call(
      config.mcpServers,
      ANTIGRAVITY_YOUTUBE_MCP_KEY,
    );

    let action: ProvisionAction = 'unchanged';
    if (enabled && !present) {
      config.mcpServers[ANTIGRAVITY_YOUTUBE_MCP_KEY] = {
        command: ANTIGRAVITY_YOUTUBE_MCP_SERVER.command,
        args: [...ANTIGRAVITY_YOUTUBE_MCP_SERVER.args],
      };
      action = 'added';
    } else if (!enabled && present) {
      delete config.mcpServers[ANTIGRAVITY_YOUTUBE_MCP_KEY];
      action = 'removed';
    }

    if (action !== 'unchanged') {
      await mkdir(dirname(configPath), { recursive: true, mode: DIR_MODE });
      await atomicWrite(configPath, `${JSON.stringify(config, null, 2)}\n`);
    }

    return { ok: true, action, path: configPath };
  } catch (err) {
    logger.warn('antigravity youtube MCP provisioning failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, action: 'unchanged', path: configPath };
  }
}
