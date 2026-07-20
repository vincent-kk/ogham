import { z } from 'zod';

import {
  type FilidConfig,
  FilidConfigSchema,
  type RuleDocStatusEntry,
  type RuleDocSyncResult,
} from '../../../../core/infra/configLoader/configLoader.js';

/** State injected into the settings page as `__FILID_STATE__`. */
export interface SettingsPageState {
  projectRoot: string;
  configExists: boolean;
  config: FilidConfig;
  ruleDocs: {
    entries: RuleDocStatusEntry[];
    autoDeployed: RuleDocStatusEntry[];
    pluginRootResolved: boolean;
  };
}

/**
 * POST /save body. `config` replaces `.filid/config.json` wholesale;
 * `ruleDocs.selections` maps optional rule ids to their desired deployed
 * state and `resync` lists drifted-but-kept ids to overwrite with the
 * current template.
 */
export const SaveBodySchema = z.object({
  config: FilidConfigSchema,
  ruleDocs: z.object({
    selections: z.record(z.string(), z.boolean()),
    resync: z.array(z.string()),
  }),
});
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
