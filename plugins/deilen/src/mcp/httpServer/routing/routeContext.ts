import type {
  ConfigScope,
  ConfigScopeState,
} from "@ogham/cross-platform/config-scope";

import type { Config } from "../../../types/config.js";

/** Dependencies wired into the route handler at server-start time. */
export interface RouteContext {
  token: string;
  projectHash: string;
  loadViewerHtml: () => string;
  loadSettingsHtml: () => string;
  /** The merged config, for handlers that only care what is in effect. */
  loadConfig: () => Promise<Config>;
  /** Both layers plus the merge, for the settings page's scope toggle. */
  loadConfigState: () => ConfigScopeState;
  saveConfig: (
    scope: ConfigScope,
    document: Record<string, unknown>,
  ) => Promise<ConfigScopeState>;
  resolveAssetPath: (name: string) => string | null;
  touch: () => void;
}
