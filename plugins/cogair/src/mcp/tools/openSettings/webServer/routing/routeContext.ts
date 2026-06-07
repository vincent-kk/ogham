import type { ProvisionResult } from '../../../../../core/agyMcpConfig/index.js';
import type { Config } from '../../../../../types/index.js';

export interface RouteContext {
  token: string;
  settingsHtml: string;
  loadConfig: () => Promise<Config>;
  saveConfig: (config: Config) => Promise<void>;
  // Side effect of /save: register/unregister the youtube-transcript MCP in
  // agy's global config so antigravity can summarize YouTube natively. Injected
  // so tests stub it instead of touching the real agy config.
  provisionYoutube: (enabled: boolean) => Promise<ProvisionResult>;
  closeServer: () => Promise<void>;
  resetTimer: () => void;
}
