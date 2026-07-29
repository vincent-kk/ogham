import type {
  ConfigScope,
  ConfigScopeState,
} from '@ogham/cross-platform/config-scope';

import type { ConfigByScope } from '../../../../../core/configManager/index.js';
import type { YoutubeProvisionSummary } from '../../../../../core/youtubeMcp/index.js';
import type { Config, YoutubeAddonConfig } from '../../../../../types/index.js';

export interface RouteContext {
  token: string;
  settingsHtml: string;
  /** The merged config, for callers that only need what is in effect. */
  loadConfig: () => Promise<Config>;
  /** The document each layer resolves to, for the page's per-scope prefill. */
  loadConfigByScope: () => Promise<ConfigByScope>;
  /** Both layers plus the merge, for the page's scope toggle. */
  loadConfigState: () => ConfigScopeState;
  saveConfig: (
    scope: ConfigScope,
    document: Record<string, unknown>,
  ) => Promise<ConfigScopeState>;
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
