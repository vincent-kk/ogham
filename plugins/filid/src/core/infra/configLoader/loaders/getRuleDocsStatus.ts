import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ruleDocsTarget } from '@ogham/cross-platform/host-paths';
import { readSection } from '@ogham/cross-platform/instructions';

import { ruleDocMarkers } from '../../../../constants/ruleDocs.js';
import { createLogger } from '../../../../lib/logger.js';
import { computeFileSha256 } from '../utils/computeFileSha256.js';
import { computeTextSha256 } from '../utils/computeTextSha256.js';
import { resolveGitRoot } from '../utils/resolveGitRoot.js';
import { resolvePluginRoot } from '../utils/resolvePluginRoot.js';

import { loadRuleDocsManifest } from './loadRuleDocsManifest.js';
import type {
  RuleDocEntry,
  RuleDocStatusEntry,
  RuleDocsManifest,
  RuleDocsStatus,
} from './manifestTypes.js';

const log = createLogger('config-loader');

/**
 * Inspect the current rule doc state from the filesystem without mutating
 * anything. Used by the setup skill to render a checkbox UI.
 *
 * The host's rule-doc channel is the SINGLE source of truth — the directory of files
 * Claude reads, or the merged instruction file Codex reads (see `ruleDocsTarget`):
 * - `deployed` → the document is present in that channel
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
  if (root === null)
    return {
      entries: [],
      autoDeployed: [],
      pluginRootResolved: false,
      manifestPath: null,
    };

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
  const target = ruleDocsTarget();
  const merged =
    target.kind === 'merge'
      ? readInstructionFile(join(resolvedRoot, target.file))
      : null;

  const entries: RuleDocStatusEntry[] = [];
  const autoDeployed: RuleDocStatusEntry[] = [];

  for (const entry of manifest.rules) {
    const deployment =
      target.kind === 'merge'
        ? inspectMergedFile(merged ?? '', root, entry)
        : inspectDirectory(resolvedRoot, target.path, entry);

    const statusEntry: RuleDocStatusEntry = {
      id: entry.id,
      filename: entry.filename,
      required: entry.required,
      title: entry.title,
      description: entry.description,
      deployed: deployment.deployed,
      selected: entry.required ? true : deployment.deployed,
      templateHash: deployment.templateHash,
      deployedHash: deployment.deployedHash,
      inSync:
        deployment.deployed &&
        deployment.deployedHash !== null &&
        deployment.deployedHash === deployment.templateHash,
    };
    if (entry.required) autoDeployed.push(statusEntry);
    else entries.push(statusEntry);
  }

  return { entries, autoDeployed, pluginRootResolved: true, manifestPath };
}

interface Deployment {
  deployed: boolean;
  deployedHash: string | null;
  /** What `deployedHash` must equal to be in sync — the shipped template, hashed the
   *  same way the deployment is, so the comparison holds in either channel. */
  templateHash: string;
}

/** One file per rule under the host's rules directory (Claude). */
function inspectDirectory(
  projectRoot: string,
  rulesPath: string,
  entry: RuleDocEntry,
): Deployment {
  const rulesDir = join(projectRoot, rulesPath);
  const destPath = join(rulesDir, entry.filename);
  // A legacy-named file counts as deployed until the user runs setup to migrate it.
  const legacyPath = entry.legacyFilename
    ? join(rulesDir, entry.legacyFilename)
    : null;

  const destExists = existsSync(destPath);
  const legacyExists = legacyPath !== null && existsSync(legacyPath);

  let deployedHash: string | null = null;
  if (destExists) deployedHash = computeFileSha256(destPath);
  else if (legacyExists && legacyPath !== null)
    deployedHash = computeFileSha256(legacyPath);

  return {
    deployed: destExists || legacyExists,
    deployedHash,
    templateHash: entry.templateHash,
  };
}

/**
 * One marked section per rule inside the merged instruction file (Codex).
 *
 * The template is hashed as the trimmed body that would be deployed, not as the raw
 * bytes the manifest hashed — otherwise a perfectly deployed section would never match,
 * since merging trims what it writes.
 */
function inspectMergedFile(
  content: string,
  pluginRoot: string,
  entry: RuleDocEntry,
): Deployment {
  const body = readSection(content, ruleDocMarkers(entry.filename));
  const templatePath = join(pluginRoot, 'templates', 'rules', entry.filename);
  const templateBody = existsSync(templatePath)
    ? readFileSync(templatePath, 'utf8').trim()
    : null;

  return {
    deployed: body !== null,
    deployedHash: body === null ? null : computeTextSha256(body),
    templateHash:
      templateBody === null
        ? entry.templateHash
        : computeTextSha256(templateBody),
  };
}

/** Absent instruction file reads as empty — no sections, nothing deployed. */
function readInstructionFile(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}
