import { existsSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform/compat';

import type { RuleDocStatus } from '../../../types/manifest.js';
import { computeFileSha256 } from '../../utils/computeFileSha256.js';
import { loadManifest } from '../loaders/loadManifest.js';
import { resolveRulesDir } from '../utils/resolveRulesDir.js';

/**
 * Snapshot every manifest rule against what is actually deployed.
 *
 * The filesystem is the only thing consulted: a rule is selected because
 * its file is on disk, never because a config said so. That is what keeps
 * the checkbox UI honest after a user deletes a file by hand.
 */
export function getRuleDocsStatus(
  projectRoot: string,
  pluginRoot: string,
): RuleDocStatus[] {
  const rulesDir = resolveRulesDir(projectRoot);

  return loadManifest(pluginRoot).rules.map((entry) => {
    const destPath = portableJoin(rulesDir, entry.filename);
    const deployed = existsSync(destPath);
    const deployedHash = deployed ? computeFileSha256(destPath) : null;

    return {
      id: entry.id,
      filename: entry.filename,
      title: entry.title,
      description: entry.description,
      deployed,
      templateHash: entry.templateHash,
      deployedHash,
      inSync: deployed && deployedHash === entry.templateHash,
    };
  });
}
