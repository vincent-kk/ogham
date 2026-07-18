import type {
  SaveBody,
  SaveSummary,
  SettingsPageState,
} from '../../types/settingsTypes.js';

export interface RouteContext {
  token: string;
  settingsHtml: string;
  /** Assemble the page state fresh per GET / (config edits elsewhere show up on refresh). */
  loadState: () => SettingsPageState;
  /** Persist one save (config write + rule doc sync). Injected so tests stub it. */
  persistSave: (body: SaveBody) => SaveSummary;
  /** Resolve pending `awaitSettled` waiters with a saved event. */
  settleSaved: (summary: SaveSummary) => void;
  closeServer: () => Promise<void>;
  resetTimer: () => void;
}
