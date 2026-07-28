import type { ConfigScopeState } from '@ogham/cross-platform/config-scope';
import { z } from 'zod';

import {
  type ConfigDiagnostic,
  type FilidConfig,
  FilidConfigSchema,
  type RuleDocStatusEntry,
  type RuleDocSyncResult,
} from '../../../../core/infra/configLoader/index.js';

/** State injected into the settings page as `__FILID_STATE__`. */
export interface SettingsPageState {
  projectRoot: string;
  configExists: boolean;
  config: FilidConfig;
  configDiagnostics: ConfigDiagnostic[];
  /** Per-layer raw documents and which dot paths the project layer overrode. */
  scope: ConfigScopeState;
  structureAdapterId: string;
  ruleDocs: {
    entries: RuleDocStatusEntry[];
    autoDeployed: RuleDocStatusEntry[];
    pluginRootResolved: boolean;
  };
}

/**
 * POST /save body. `config` replaces the named layer wholesale;
 * `ruleDocs.selections` maps optional rule ids to their desired deployed
 * state and `resync` lists drifted-but-kept ids to overwrite with the
 * current template.
 *
 * `scope` is required rather than defaulted: the page always knows which
 * layer it is editing, and a silent default would write the wrong file when
 * a caller forgets.
 */
export const SaveBodySchema = z
  .object({
    scope: z.enum(['user', 'project']),
    config: FilidConfigSchema,
    ruleDocs: z.object({
      selections: z.record(z.string(), z.boolean()),
      resync: z.array(z.string()),
    }),
  })
  .strict();
export type SaveBody = z.infer<typeof SaveBodySchema>;

/** Summary carried by a `saved` settle event and the tool response. */
export interface SaveSummary {
  configWritten: boolean;
  ruleDocs: RuleDocSyncResult;
}

/** Outcome of one bounded wait on the settings session. */
export type SettleEvent =
  | { kind: 'saved'; summary: SaveSummary }
  | { kind: 'closed' }
  | { kind: 'pending' };
