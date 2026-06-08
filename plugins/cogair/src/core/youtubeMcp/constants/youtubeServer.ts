import type { YoutubeAddonLanguage } from '../../../types/index.js';

// Shared definition of the youtube-transcript MCP server (@ogham/yt-dlp-mcp),
// provisioned identically into antigravity's mcp_config.json and codex's config.toml.
// The CLIs invoke this server on their own in headless mode, so cogair only ensures
// it is registered — no dispatch-path change.
export const YOUTUBE_MCP_KEY = 'youtube-transcript';
export const YOUTUBE_MCP_COMMAND = 'npx';
export const YOUTUBE_MCP_ARGS: readonly string[] = ['-y', '@ogham/yt-dlp-mcp'];

// YTDLP_LANG sets the server's title/metadata language and the transcript-language
// fallback (yt-dlp-mcp resolves YTDLP_DEFAULT_SUB_LANG ?? YTDLP_LANG ?? 'en').
export function youtubeMcpEnv(
  language: YoutubeAddonLanguage,
): Record<string, string> {
  return { YTDLP_LANG: language };
}
