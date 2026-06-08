import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { DIR_MODE } from '../../../constants/defaults.js';
import { AGY_MCP_CONFIG_PATH } from '../../../constants/paths.js';
import { atomicWrite } from '../../../lib/atomicWrite.js';
import { logger } from '../../../lib/logger.js';
import type { YoutubeAddonLanguage } from '../../../types/index.js';
import {
  YOUTUBE_MCP_ARGS,
  YOUTUBE_MCP_COMMAND,
  YOUTUBE_MCP_KEY,
  youtubeMcpEnv,
} from '../constants/youtubeServer.js';
import { readMcpConfig } from '../utils/readMcpConfig.js';

import type { ProvisionAction, ProvisionResult } from './provisionResult.js';

interface DesiredServer {
  command: string;
  args: string[];
  env: Record<string, string>;
}

function desiredServer(language: YoutubeAddonLanguage): DesiredServer {
  return {
    command: YOUTUBE_MCP_COMMAND,
    args: [...YOUTUBE_MCP_ARGS],
    env: youtubeMcpEnv(language),
  };
}

// True when an existing mcp_config entry already equals the canonical definition,
// so we can skip the write. Compares command, args (ordered), and env exactly.
function entryMatches(existing: unknown, desired: DesiredServer): boolean {
  if (existing === null || typeof existing !== 'object') return false;
  const e = existing as Record<string, unknown>;
  if (e.command !== desired.command) return false;
  const args = Array.isArray(e.args) ? e.args : null;
  if (!args || args.length !== desired.args.length) return false;
  if (!desired.args.every((a, i) => args[i] === a)) return false;
  const env =
    e.env && typeof e.env === 'object'
      ? (e.env as Record<string, unknown>)
      : null;
  if (!env) return false;
  const keys = Object.keys(desired.env);
  if (Object.keys(env).length !== keys.length) return false;
  return keys.every((k) => env[k] === desired.env[k]);
}

// Idempotently registers (enabled) or unregisters (disabled) the yt-dlp-mcp
// MCP server in antigravity's global mcp_config.json. While enabled, cogair owns the
// entry: it writes the canonical command/args/env (env carries YTDLP_LANG), so a
// language change is reapplied on the next save. Preserves every other server and
// top-level key. Never throws: any read/write failure resolves to `{ ok: false }`
// and a warning, so the settings save it backs is never broken by an agy-config problem.
export async function provisionAntigravityYoutube(
  enabled: boolean,
  language: YoutubeAddonLanguage,
  configPath: string = AGY_MCP_CONFIG_PATH,
): Promise<ProvisionResult> {
  try {
    const config = await readMcpConfig(configPath);
    const present = Object.prototype.hasOwnProperty.call(
      config.mcpServers,
      YOUTUBE_MCP_KEY,
    );

    let action: ProvisionAction = 'unchanged';
    if (enabled) {
      const desired = desiredServer(language);
      if (
        !present ||
        !entryMatches(config.mcpServers[YOUTUBE_MCP_KEY], desired)
      ) {
        config.mcpServers[YOUTUBE_MCP_KEY] = desired;
        action = 'added';
      }
    } else if (present) {
      delete config.mcpServers[YOUTUBE_MCP_KEY];
      action = 'removed';
    }

    if (action !== 'unchanged') {
      await mkdir(dirname(configPath), { recursive: true, mode: DIR_MODE });
      await atomicWrite(configPath, `${JSON.stringify(config, null, 2)}\n`);
    }

    return { ok: true, action };
  } catch (err) {
    logger.warn('antigravity youtube MCP provisioning failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, action: 'unchanged' };
  }
}
