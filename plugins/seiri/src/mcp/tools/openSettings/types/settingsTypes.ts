import { z } from 'zod';

import { INTERVENTION_LEVELS } from '../../../../constants/intervention.js';
import type {
  ConfigScopeSnapshot,
  SeiriConfig,
  SeiriConfigScope,
} from '../../../../types/config.js';
import type {
  RuleDocStatus,
  RuleDocSyncResult,
} from '../../../../types/manifest.js';

/** One layer's rule-document snapshot, as that layer's channel reports it. */
export interface RuleDocLayerState {
  /** Per-rule status inspected against this layer's channel. */
  entries: RuleDocStatus[];
  /**
   * Absolute channel path this layer writes into, or `null` when the runtime
   * host has no rule channel. Resolved here rather than in the page: under a
   * Codex host the channel is a section inside `AGENTS.md`, so a page joining
   * a channel to a filename would render a path that does not exist.
   */
  displayTarget: string | null;
}

/** State injected into the settings page as `__SEIRI_STATE__`. */
export interface SettingsPageState {
  projectRoot: string;
  /** True when the project layer holds a dial — what the page edits by default. */
  configExists: boolean;
  /** The dial in effect across both stored layers. */
  config: SeiriConfig;
  /** Per-layer dials and which one is overriding, for the scope toggle. */
  scope: ConfigScopeSnapshot;
  ruleDocs: {
    pluginRootResolved: boolean;
    /**
     * The layer the page is showing — the same toggle that decides where the
     * dial is stored, because a rule set that follows one layer and a dial
     * that follows another would need two decisions for one question.
     */
    scope: SeiriConfigScope;
    /**
     * Both layers, so moving the toggle can redraw from state already in hand.
     * A page holding only the active layer would keep showing the channel it
     * just left until the next round trip.
     */
    layers: { user: RuleDocLayerState; project: RuleDocLayerState };
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
  /**
   * Which layer the dial lands in. Required rather than defaulted: the page
   * always knows, and a silent default would write the wrong file when a
   * caller forgets.
   */
  scope: z.enum(['user', 'project']),
  config: z.object({ intervention: z.enum(INTERVENTION_LEVELS) }),
  ruleDocs: z.object({
    selections: z.record(z.string(), z.boolean()),
    resync: z.array(z.string()),
    revision: z.string().nullable().optional(),
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
