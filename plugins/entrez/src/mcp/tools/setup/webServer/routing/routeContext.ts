import type { ConfigScope, ConfigScopeState } from "@ogham/cross-platform";

import type { ConfigByScope } from "../../../../../core/config/index.js";
import type {
  EntrezConfig,
  EntrezConfigInput,
} from "../../../../../types/config.js";
import type { EntrezCredentials } from "../../../../../types/config.js";
import type {
  SetupFormData,
  ConnectionTestResult,
} from "../../../../../types/setup.js";

/** Dependencies + lifecycle handed to setup route handlers (avoids cycles). */
export interface RouteContext {
  /** Per-session token the server issues; requests must carry `?token=`. */
  token: string;
  settingsHtml: string;
  loadConfig: () => Promise<EntrezConfig | null>;
  /** The config each layer resolves to, for the page's per-scope prefill. */
  loadConfigByScope: () => Promise<ConfigByScope>;
  loadCredentials: () => Promise<EntrezCredentials>;
  /** Both layers plus the merge, for the page's scope toggle. */
  loadConfigScope: () => ConfigScopeState;
  saveConfig: (
    scope: ConfigScope,
    config: Partial<EntrezConfigInput>,
  ) => Promise<ConfigScopeState>;
  saveCredentials: (credentials: EntrezCredentials) => Promise<void>;
  testConnection: (data: SetupFormData) => Promise<ConnectionTestResult>;
  resetTimer: () => void;
  closeServer: () => Promise<void>;
}
