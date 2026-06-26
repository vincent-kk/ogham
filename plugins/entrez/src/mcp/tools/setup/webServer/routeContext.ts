import type {
  EntrezConfig,
  EntrezConfigInput,
} from "../../../../types/config.js";
import type { EntrezCredentials } from "../../../../types/config.js";
import type {
  SetupFormData,
  ConnectionTestResult,
} from "../../../../types/setup.js";

/** Dependencies + lifecycle handed to setup route handlers (avoids cycles). */
export interface RouteContext {
  settingsHtml: string;
  loadConfig: () => Promise<EntrezConfig | null>;
  loadCredentials: () => Promise<EntrezCredentials>;
  saveConfig: (config: EntrezConfigInput) => Promise<void>;
  saveCredentials: (credentials: EntrezCredentials) => Promise<void>;
  testConnection: (data: SetupFormData) => Promise<ConnectionTestResult>;
  resetTimer: () => void;
  closeServer: () => Promise<void>;
}
