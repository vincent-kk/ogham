import type { Config } from "../../../types/config.js";

/** Dependencies wired into the route handler at server-start time. */
export interface RouteContext {
  token: string;
  projectHash: string;
  loadViewerHtml: () => string;
  loadSettingsHtml: () => string;
  loadConfig: () => Promise<Config>;
  saveConfig: (config: Config) => Promise<void>;
  resolveAssetPath: (name: string) => string | null;
  touch: () => void;
}
