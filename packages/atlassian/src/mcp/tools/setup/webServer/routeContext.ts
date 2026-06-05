import type {
  AtlassianConfig,
  Credentials,
  ServiceCredentials,
  ConnectionTestResult,
} from "../../../../types/index.js";

/** Shared context handed to every route handler. Defined in its own file so
 *  routes.ts and handlers/* can both depend on the type without creating a
 *  routes.ts ↔ handlers/* import cycle. */
export interface RouteContext {
  settingsHtml: string;
  loadConfig: () => Promise<AtlassianConfig>;
  saveConfig: (config: AtlassianConfig) => Promise<void>;
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
