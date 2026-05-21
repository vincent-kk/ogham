import type { Config } from '../../../../../types/index.js';

export interface RouteContext {
  token: string;
  settingsHtml: string;
  loadConfig: () => Promise<Config>;
  saveConfig: (config: Config) => Promise<void>;
  closeServer: () => Promise<void>;
  resetTimer: () => void;
}
