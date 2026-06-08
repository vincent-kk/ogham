import { spawnCli } from '@ogham/cross-platform';

import { logger } from '../../../lib/logger.js';
import type { YoutubeAddonLanguage } from '../../../types/index.js';
import {
  YOUTUBE_MCP_ARGS,
  YOUTUBE_MCP_COMMAND,
  YOUTUBE_MCP_KEY,
} from '../constants/youtubeServer.js';

import type { ProvisionResult } from './provisionResult.js';

export interface CodexRunResult {
  notInstalled: boolean;
  failed: boolean;
  code: number | null;
  stderr: string;
}

// Injectable so tests assert the argv without spawning codex.
export type CodexMcpRunner = (args: string[]) => Promise<CodexRunResult>;

const defaultRunner: CodexMcpRunner = async (args) => {
  const result = await spawnCli('codex', args, {});
  const notInstalled =
    !!result.spawnError &&
    (result.spawnError as NodeJS.ErrnoException).code === 'ENOENT';
  return {
    notInstalled,
    failed: !!result.spawnError || result.timedOut || (result.code ?? 1) !== 0,
    code: result.code,
    stderr: result.stderr,
  };
};

// Registers (enabled) or removes (disabled) the yt-dlp-mcp MCP server in
// codex's config.toml via `codex mcp add|remove` — codex owns the TOML, so cogair
// never hand-edits it. `codex mcp add` overwrites idempotently (a language change is
// reapplied) and `codex mcp remove` is a no-op when absent. Never throws; a missing
// codex binary degrades quietly to `{ ok: false }` without a warning.
export async function provisionCodexYoutube(
  enabled: boolean,
  language: YoutubeAddonLanguage,
  run: CodexMcpRunner = defaultRunner,
): Promise<ProvisionResult> {
  const args = enabled
    ? [
        'mcp',
        'add',
        YOUTUBE_MCP_KEY,
        '--env',
        `YTDLP_LANG=${language}`,
        '--',
        YOUTUBE_MCP_COMMAND,
        ...YOUTUBE_MCP_ARGS,
      ]
    : ['mcp', 'remove', YOUTUBE_MCP_KEY];

  try {
    const result = await run(args);
    if (result.failed) {
      if (!result.notInstalled) {
        logger.warn('codex youtube MCP provisioning failed', {
          code: result.code,
          stderr: result.stderr.slice(0, 200),
        });
      }
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
