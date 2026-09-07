import type { ConfigScopeState } from '@ogham/cross-platform';
import { z } from 'zod';

import {
  type ConfigDiagnostic,
  type FilidConfig,
  FilidConfigSchema,
  type RuleDocStatusEntry,
  type RuleDocSyncResult,
} from '../../../../../core/infra/configLoader/index.js';

/** One layer's rule document deployment, as the page renders it. */
export interface RuleDocsLayerSnapshot {
  entries: RuleDocStatusEntry[];
  autoDeployed: RuleDocStatusEntry[];
  /**
   * Absolute path to this layer's channel, or `null` on a host with none.
   * Each entry's own `displayTarget` is relative to this root, which the page
   * has no other way to name — `rules/x.md` alone reads as a project path.
   */
  displayTarget: string | null;
}

/** State injected into the settings page as `__FILID_STATE__`. */
export interface SettingsPageState {
  projectRoot: string;
  configExists: boolean;
  /**
   * The config each layer resolves to. The page seats its form — and starts
   * its save document — from the one the toggle names, so a save under `user`
   * never carries the project layer's overrides back into the user file.
   * `project` is the effective merge; `user` is that layer alone over the
   * shipped defaults.
   */
  configByScope: {
    user: FilidConfig;
    project: FilidConfig;
  };
  configDiagnostics: ConfigDiagnostic[];
  /** Per-layer raw documents and which dot paths the project layer overrode. */
  scope: ConfigScopeState;
  structureAdapterId: string;
  /**
   * Both layers, because the page has no server round-trip between opening and
   * saving — the scope toggle switches which snapshot it renders. Resolving
   * the channel on the page instead is not an option: on Codex the channel is
   * an owned section of `AGENTS.md`, not a directory, so channel + filename
   * would be a path that does not exist.
   */
  ruleDocs: {
    layers: {
      user: RuleDocsLayerSnapshot;
      project: RuleDocsLayerSnapshot;
    };
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
/** Validated payload persisted by the settings save endpoint. */
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
