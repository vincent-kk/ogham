import type { RuleDocSyncResult } from '../../../../../types/manifest.js';
import type {
  SaveBody,
  SaveSummary,
  SettingsPageState,
} from '../../types/settingsTypes.js';

export interface RouteContext {
  token: string;
  settingsHtml: string;
  /** Assemble page state per GET /, so edits made elsewhere show on refresh. */
  loadState: () => SettingsPageState;
  /** Dry-run the current selection. Nothing is written. */
  planSave: (body: SaveBody) => RuleDocSyncResult;
  /** Persist one save (dial write + rule doc sync). Injected so tests stub it. */
  persistSave: (body: SaveBody) => SaveSummary;
  /** Resolve pending `awaitSettled` waiters with a saved event. */
  settleSaved: (summary: SaveSummary) => void;
  closeServer: () => Promise<void>;
  resetTimer: () => void;
}
