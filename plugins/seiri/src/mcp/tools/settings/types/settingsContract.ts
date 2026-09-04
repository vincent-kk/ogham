import type {
  RuleDocStatus,
  RuleDocSyncResult,
  RuleDocsManifest,
} from '../../../../types/manifest.js';
import type {
  ConfigActionResult,
  ConfigOp,
} from '../utils/applyConfigAction.js';

import type { SaveSummary } from './settingsTypes.js';

export type SettingsAction =
  'open' | 'status' | 'manifest' | 'plan' | 'sync' | 'config';

export interface SettingsInput {
  action: SettingsAction;
  project_root?: string;
  wait_seconds?: number;
  /** Rule ids map to opt-in state; omitted ids are treated as opted out. */
  selections?: Record<string, boolean> | null;
  /** Rule ids whose local edits may be discarded. */
  resync?: string[] | null;
  /** Optional revision returned by `plan`; stale revisions are not applied. */
  revision?: string | null;
  /** Operation for `action: "config"`; defaults to reading the dial. */
  config_op?: ConfigOp | null;
  /** Dial position for `config_op: "set"`. */
  intervention?: string | null;
}

export interface SettingsToolExtra {
  signal?: AbortSignal;
}

export type SettingsOutput =
  | {
      action: 'open';
      status: 'saved' | 'closed' | 'pending';
      url: string;
      summary?: SaveSummary;
      message: string;
    }
  | { action: 'status'; entries: RuleDocStatus[] }
  | { action: 'manifest'; manifest: RuleDocsManifest }
  | {
      action: 'plan' | 'sync';
      result: RuleDocSyncResult;
      selected: string[];
    }
  | ConfigActionResult;
