import { pluginRoot } from '@ogham/cross-platform/host-paths';
import { projectRoot } from '@ogham/cross-platform/host-paths';

import {
  applyRuleDocs,
  getRuleDocsStatus,
  loadManifest,
  planRuleDocs,
} from '../../../core/ruleDocs/index.js';
import type {
  RuleDocStatus,
  RuleDocSyncResult,
  RuleDocsManifest,
} from '../../../types/manifest.js';

import type {
  ConfigActionResult,
  ConfigOp,
} from './utils/applyConfigAction.js';
import { applyConfigAction } from './utils/applyConfigAction.js';

export type RuleDocsAction = 'status' | 'manifest' | 'plan' | 'sync' | 'config';

export interface RuleDocsSyncInput {
  action: RuleDocsAction;
  project_root?: string;
  /**
   * Rule id → opt-in flag. Required for `plan` and `sync`; ids absent from
   * the map count as opted out, which is what removes a deployed file.
   */
  selections?: Record<string, boolean> | null;
  /** Rule ids whose local edits may be discarded. Drift is kept otherwise. */
  resync?: string[] | null;
  /** What the `config` action should do. Defaults to reading the dial. */
  config_op?: ConfigOp | null;
  /** Dial position for `config_op: "set"`. */
  intervention?: string | null;
}

export type RuleDocsSyncOutput =
  | { action: 'status'; entries: RuleDocStatus[] }
  | { action: 'manifest'; manifest: RuleDocsManifest }
  | { action: 'plan' | 'sync'; result: RuleDocSyncResult; selected: string[] }
  | ConfigActionResult;

/**
 * Inspect or reconcile `.claude/rules/`.
 *
 * The settings page is the interactive path; this tool is the headless
 * fallback for hosts without a browser and for scripted setup. Session
 * hooks must never call it — rule files change only by explicit user
 * action.
 *
 * `plan` answers the same question as `sync` without writing, so a caller
 * that cannot render the settings page can still show the diff first.
 *
 * `config` is the dial rather than the rule files, absorbed here instead
 * of becoming a third tool: every registered schema is context spent on
 * every turn, and one more action costs a fraction of one more tool.
 */
export function handleRuleDocsSync(
  input: RuleDocsSyncInput,
): RuleDocsSyncOutput {
  const root = projectRoot(input.project_root);

  // Before the plugin-root check: the dial lives in the project, so
  // reading or lowering it must work even where the shipped templates do
  // not resolve — that is exactly when someone wants to turn seiri down.
  if (input.action === 'config')
    return applyConfigAction(
      root,
      input.config_op ?? 'get',
      input.intervention,
    );

  const plugin = pluginRoot();
  if (plugin === null)
    throw new Error(
      'Cannot locate the seiri plugin directory, so the rule templates it ships are unreachable.',
    );

  if (input.action === 'manifest')
    return { action: 'manifest', manifest: loadManifest(plugin) };

  if (input.action === 'status')
    return { action: 'status', entries: getRuleDocsStatus(root, plugin) };

  const selections = input.selections;
  if (!selections || typeof selections !== 'object')
    throw new Error(`selections is required for action "${input.action}"`);

  const selected = Object.entries(selections)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);
  const options = { resync: input.resync ?? [] };

  if (input.action === 'plan')
    return {
      action: 'plan',
      result: planRuleDocs(root, plugin, selected, options),
      selected,
    };

  return {
    action: 'sync',
    result: applyRuleDocs(root, plugin, selected, options),
    selected,
  };
}
