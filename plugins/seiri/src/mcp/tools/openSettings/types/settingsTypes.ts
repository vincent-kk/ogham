import { z } from 'zod';

import { INTERVENTION_LEVELS } from '../../../../constants/intervention.js';
import type { SeiriConfig } from '../../../../types/config.js';
import type {
  RuleDocStatus,
  RuleDocSyncResult,
} from '../../../../types/manifest.js';

/** State injected into the settings page as `__SEIRI_STATE__`. */
export interface SettingsPageState {
  projectRoot: string;
  configExists: boolean;
  config: SeiriConfig;
  ruleDocs: {
    entries: RuleDocStatus[];
    pluginRootResolved: boolean;
  };
}

/**
 * Body shared by POST /plan and POST /save.
 *
 * `selections` maps rule id → desired deployed state; `resync` lists the
 * drifted ids whose local edits the user agreed to discard. /plan runs
 * this through the same judgment as /save without writing, which is what
 * lets the page show the diff before anything lands.
 */
export const SaveBodySchema = z.object({
  config: z.object({ intervention: z.enum(INTERVENTION_LEVELS) }),
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
