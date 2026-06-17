import type { YoutubeProvisionSummary } from '../../../../../core/youtubeMcp/index.js';
import type { Config, YoutubeAddonConfig } from '../../../../../types/index.js';

export interface RouteContext {
  token: string;
  settingsHtml: string;
  loadConfig: () => Promise<Config>;
  saveConfig: (config: Config) => Promise<void>;
  // Side effect of /save: reconcile the yt-dlp-mcp MCP addon across its
  // target CLIs (antigravity's mcp_config.json + codex's config.toml). `prev` is the
  // config before this save, passed so codex provisioning can skip needless spawns.
  // Injected so tests stub it instead of touching real CLI configs.
  provisionYoutube: (
    next: YoutubeAddonConfig,
    prev?: YoutubeAddonConfig,
  ) => Promise<YoutubeProvisionSummary>;
  closeServer: () => Promise<void>;
  resetTimer: () => void;
}
