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

export type RuleDocsAction = 'status' | 'manifest' | 'plan' | 'sync';

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
}

export type RuleDocsSyncOutput =
  | { action: 'status'; entries: RuleDocStatus[] }
  | { action: 'manifest'; manifest: RuleDocsManifest }
  | { action: 'plan' | 'sync'; result: RuleDocSyncResult; selected: string[] };

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
 */
export function handleRuleDocsSync(
  input: RuleDocsSyncInput,
): RuleDocsSyncOutput {
  const plugin = pluginRoot();
  if (plugin === null)
    throw new Error(
      'Cannot locate the seiri plugin directory, so the rule templates it ships are unreachable.',
    );

  const root = projectRoot(input.project_root);

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
