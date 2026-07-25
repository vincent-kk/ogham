import { inspectRuleDocumentStatus } from '@ogham/agent-artifacts/rules/status';
import { resolveContainedPath } from '@ogham/cross-platform/paths/contained';

import { createLogger } from '../../../../lib/logger.js';
import { resolvePluginRoot } from '../utils/resolvePluginRoot.js';

import { loadManagedRuleDocuments } from './loadManagedRuleDocuments.js';
import { loadRuleDocsManifest } from './loadRuleDocsManifest.js';
import type {
  RuleDocStatusEntry,
  RuleDocsManifest,
  RuleDocsStatus,
} from './manifestTypes.js';
import { resolveFilidRuleTarget } from './resolveFilidRuleTarget.js';

const log = createLogger('config-loader');

/**
 * Inspect the current rule doc state from the filesystem without mutating
 * anything. Used by the setup skill to render a checkbox UI.
 *
 * The host's rule-doc channel is the SINGLE source of truth — the directory of files
 * Claude reads, or the merged instruction file Codex reads (see `ruleDocsTarget`):
 * - `deployed` → the document is active in the effective host channel
 * - `selected` → stored deployment for optional entries; always `true` for required
 *
 * Required entries are partitioned into `autoDeployed` and are NEVER
 * rendered in the checkbox UI — they are auto-synced by `syncRuleDocs`
 * regardless of user input. Optional entries go into `entries`.
 *
 * No `.filid/config.json` inspection is performed — rule doc state is never
 * mirrored into the config.
 */
export function getRuleDocsStatus(
  projectRoot: string,
  pluginRoot?: string,
): RuleDocsStatus {
  const root = resolvePluginRoot(pluginRoot);
  if (root === null)
    return {
      entries: [],
      autoDeployed: [],
      pluginRootResolved: false,
      manifestPath: null,
    };

  const manifestPath = resolveContainedPath(
    root,
    'templates',
    'rules',
    'manifest.json',
  );
  let manifest: RuleDocsManifest;
  try {
    manifest = loadRuleDocsManifest(root);
  } catch (err) {
    log.error('failed to load rule docs manifest', err);
    return {
      entries: [],
      autoDeployed: [],
      pluginRootResolved: true,
      manifestPath,
    };
  }

  const target = resolveFilidRuleTarget(projectRoot);
  if (target === null)
    return {
      entries: [],
      autoDeployed: [],
      pluginRootResolved: true,
      manifestPath,
    };

  let inspections;
  try {
    const documents = loadManagedRuleDocuments(root, manifest);
    inspections = inspectRuleDocumentStatus(
      { owner: 'filid', target },
      documents,
    );
  } catch (err) {
    log.error('failed to inspect rule docs', err);
    return {
      entries: [],
      autoDeployed: [],
      pluginRootResolved: true,
      manifestPath,
    };
  }

  const entries: RuleDocStatusEntry[] = [];
  const autoDeployed: RuleDocStatusEntry[] = [];

  for (const [index, entry] of manifest.rules.entries()) {
    const inspection = inspections[index];
    if (inspection === undefined) continue;
    const templateHash = inspection.expectedHash ?? entry.templateHash;

    const statusEntry: RuleDocStatusEntry = {
      id: entry.id,
      filename: entry.filename,
      target: inspection.activeTarget,
      displayTarget: inspection.activeDisplayTarget,
      source: inspection.activeSource,
      required: entry.required,
      title: entry.title,
      description: entry.description,
      deployed: inspection.active,
      selected: entry.required ? true : inspection.deployed,
      templateHash,
      deployedHash: inspection.activeDeployedHash,
      inSync:
        inspection.active &&
        inspection.activeDeployedHash !== null &&
        inspection.activeDeployedHash === templateHash,
    };
    if (entry.required) autoDeployed.push(statusEntry);
    else entries.push(statusEntry);
  }

  return { entries, autoDeployed, pluginRootResolved: true, manifestPath };
}
