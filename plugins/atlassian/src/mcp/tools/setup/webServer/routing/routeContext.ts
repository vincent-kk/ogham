import type { ConfigScope, ConfigScopeState } from "@ogham/cross-platform";

import type { ConfigByScope } from "../../../../../core/index.js";
import type {
  AtlassianConfig,
  Credentials,
  ServiceCredentials,
  ConnectionTestResult,
} from "../../../../../types/index.js";

/** Shared context handed to every route handler. Defined in its own file so
 *  routes.ts and handlers/* can both depend on the type without creating a
 *  routes.ts ↔ handlers/* import cycle. */
export interface RouteContext {
  /** Per-session token the server issues; requests must carry `?token=`. */
  token: string;
  settingsHtml: string;
  loadConfig: () => Promise<AtlassianConfig>;
  /** The config each layer resolves to, for the page's per-scope prefill. */
  loadConfigByScope: () => Promise<ConfigByScope>;
  /** Both layers plus the merge, for the page's scope toggle. */
  loadConfigScope: () => ConfigScopeState;
  saveConfig: (
    scope: ConfigScope,
    config: Partial<AtlassianConfig>,
  ) => Promise<ConfigScopeState>;
  loadCredentials: () => Promise<Credentials>;
  saveCredentials: (credentials: Credentials) => Promise<void>;
  testConnection: (params: {
    base_url: string;
    credentials: ServiceCredentials;
    username?: string;
    service: "jira" | "confluence";
    api_version_override?: "2" | "3";
  }) => Promise<ConnectionTestResult>;
  resetTimer: () => void;
  closeServer: () => Promise<void>;
}
