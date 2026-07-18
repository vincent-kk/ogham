import type {
  SettingsPageState,
  SettingsSaveBody,
  SettingsSaveSummary,
} from '../../../../../types/settings.js';

export interface RouteContext {
  token: string;
  settingsHtml: string;
  /** Assemble the page state fresh per GET / (bootstrap updates show up on refresh). */
  loadState: () => Promise<SettingsPageState>;
  /** Persist one save (atomic config write). Injected so tests stub it. */
  persistSave: (body: SettingsSaveBody) => Promise<SettingsSaveSummary>;
  /** Resolve pending `awaitSettled` waiters with a saved event. */
  settleSaved: (summary: SettingsSaveSummary) => void;
  closeServer: () => Promise<void>;
  resetTimer: () => void;
}
