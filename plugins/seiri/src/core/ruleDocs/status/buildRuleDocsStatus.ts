import {
  type DirectoryRuleTarget,
  type SectionArtifactTarget,
  inspectRuleDocumentStatus,
} from '@ogham/agent-artifacts';

import type { RuleDocStatus } from '../../../types/manifest.js';
import { loadManagedRuleDocuments } from '../loaders/loadManagedRuleDocuments.js';
import { loadManifest } from '../loaders/loadManifest.js';

/**
 * Snapshot every manifest rule against a caller-resolved rule channel.
 *
 * The filesystem is the only thing consulted: a rule is selected because
 * its file is on disk, never because a config said so. That is what keeps
 * the checkbox UI honest after a user deletes a file by hand.
 *
 * @param pluginRoot Root the manifest and templates are read from.
 * @param resolveTarget Resolves the layer's rule channel; called only
 *   after the manifest is confirmed readable, so a manifest read failure
 *   still throws before any target resolution.
 * @returns One entry per shipped rule, in manifest order.
 */
export function buildRuleDocsStatus(
  pluginRoot: string,
  resolveTarget: () => DirectoryRuleTarget | SectionArtifactTarget | null,
): RuleDocStatus[] {
  const manifest = loadManifest(pluginRoot);
  const documents = loadManagedRuleDocuments(pluginRoot, manifest);
  const target = resolveTarget();

  if (target === null)
    return manifest.rules.map((entry) => ({
      id: entry.id,
      filename: entry.filename,
      title: entry.title,
      description: entry.description,
      recommended: entry.recommended === true,
      target: '',
      displayTarget: 'unsupported host rule channel',
      source: null,
      deployed: false,
      active: false,
      activeTarget: '',
      activeDisplayTarget: 'unsupported host rule channel',
      activeDeployedHash: null,
      activeInSync: false,
      activeSource: null,
      templateHash: entry.templateHash,
      deployedHash: null,
      inSync: false,
    }));

  const inspections = new Map(
    inspectRuleDocumentStatus({ owner: 'seiri', target }, documents).map(
      (inspection) => [inspection.id, inspection],
    ),
  );

  return manifest.rules.flatMap((entry) => {
    const inspection = inspections.get(entry.id);
    if (inspection === undefined) return [];
    return {
      id: entry.id,
      filename: entry.filename,
      title: entry.title,
      description: entry.description,
      recommended: entry.recommended === true,
      target: inspection.target,
      displayTarget: inspection.displayTarget,
      source: inspection.source,
      deployed: inspection.deployed,
      active: inspection.active,
      activeTarget: inspection.activeTarget,
      activeDisplayTarget: inspection.activeDisplayTarget,
      activeDeployedHash: inspection.activeDeployedHash,
      activeInSync: inspection.activeInSync,
      activeSource: inspection.activeSource,
      templateHash: inspection.expectedHash ?? entry.templateHash,
      deployedHash: inspection.deployedHash,
      inSync: inspection.inSync,
    };
  });
}
