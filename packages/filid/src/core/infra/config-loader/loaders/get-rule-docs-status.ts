import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import { computeFileSha256 } from '../utils/compute-file-sha256.js';
import { resolveGitRoot } from '../utils/resolve-git-root.js';
import { resolvePluginRoot } from '../utils/resolve-plugin-root.js';
import { loadRuleDocsManifest } from './load-rule-docs-manifest.js';
import type {
  RuleDocStatusEntry,
  RuleDocsManifest,
  RuleDocsStatus,
} from './manifest-types.js';

const log = createLogger('config-loader');

/**
 * Inspect the current rule doc state from the filesystem without mutating
 * anything. Used by the filid-setup skill to render a checkbox UI.
 *
 * The filesystem (`.claude/rules/<filename>`) is the SINGLE source of truth:
 * - `deployed` → file exists on disk
 * - `selected` → `deployed` for optional entries; always `true` for required
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
  if (root === null) {
    return {
      entries: [],
      autoDeployed: [],
      pluginRootResolved: false,
      manifestPath: null,
    };
  }

  const manifestPath = join(root, 'templates', 'rules', 'manifest.json');
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

  const resolvedRoot = resolveGitRoot(projectRoot);

  const entries: RuleDocStatusEntry[] = [];
  const autoDeployed: RuleDocStatusEntry[] = [];

  for (const entry of manifest.rules) {
    const destPath = join(resolvedRoot, '.claude', 'rules', entry.filename);
    // Also check legacy filename for transition period — a legacy file
    // counts as "deployed" until the user runs filid-setup to migrate.
    const legacyPath = entry.legacyFilename
      ? join(resolvedRoot, '.claude', 'rules', entry.legacyFilename)
      : null;

    const destExists = existsSync(destPath);
    const legacyExists = legacyPath !== null && existsSync(legacyPath);
    const deployed = destExists || legacyExists;

    let deployedHash: string | null = null;
    if (destExists) deployedHash = computeFileSha256(destPath);
    else if (legacyExists && legacyPath !== null)
      deployedHash = computeFileSha256(legacyPath);

    const inSync =
      deployed && deployedHash !== null && deployedHash === entry.templateHash;

    const statusEntry: RuleDocStatusEntry = {
      id: entry.id,
      filename: entry.filename,
      required: entry.required,
      title: entry.title,
      description: entry.description,
      deployed,
      selected: entry.required ? true : deployed,
      templateHash: entry.templateHash,
      deployedHash,
      inSync,
    };
    if (entry.required) {
      autoDeployed.push(statusEntry);
    } else {
      entries.push(statusEntry);
    }
  }

  return { entries, autoDeployed, pluginRootResolved: true, manifestPath };
}
