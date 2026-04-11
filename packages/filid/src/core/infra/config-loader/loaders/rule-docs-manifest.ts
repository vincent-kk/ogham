import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import { resolveGitRoot } from '../utils/resolve-git-root.js';
import { resolvePluginRoot } from '../utils/resolve-plugin-root.js';

const log = createLogger('config-loader');

/** Single entry in templates/rules/manifest.json. */
export interface RuleDocEntry {
  id: string;
  filename: string;
  required: boolean;
  title: string;
  description: string;
}

/** Envelope for templates/rules/manifest.json. */
export interface RuleDocsManifest {
  version: string;
  rules: RuleDocEntry[];
}

/** Report returned by syncRuleDocs. */
export interface RuleDocSyncResult {
  copied: string[];
  removed: string[];
  unchanged: string[];
  skipped: Array<{ id: string; reason: string }>;
}

/** Per-rule status snapshot used by the filid-setup checkbox UI. */
export interface RuleDocStatusEntry {
  id: string;
  filename: string;
  required: boolean;
  title: string;
  description: string;
  /** File currently exists on disk under `.claude/rules/`. */
  deployed: boolean;
  /**
   * Desired state for the checkbox UI. Derived from the filesystem:
   * `true` when the rule is required or the doc is currently deployed.
   * Filesystem is the single source of truth — no config-side tracking.
   */
  selected: boolean;
}

/** Result of getRuleDocsStatus. */
export interface RuleDocsStatus {
  entries: RuleDocStatusEntry[];
  pluginRootResolved: boolean;
  manifestPath: string | null;
}

/**
 * Load and validate the rule docs manifest shipped with the filid plugin.
 * Throws if the manifest is missing or malformed.
 */
export function loadRuleDocsManifest(pluginRoot: string): RuleDocsManifest {
  const manifestPath = join(pluginRoot, 'templates', 'rules', 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`rule docs manifest not found at ${manifestPath}`);
  }
  const raw = readFileSync(manifestPath, 'utf8');
  const parsed = JSON.parse(raw) as RuleDocsManifest;
  if (!parsed || !Array.isArray(parsed.rules)) {
    throw new Error(`rule docs manifest has invalid shape at ${manifestPath}`);
  }
  return parsed;
}

/**
 * Inspect the current rule doc state from the filesystem without mutating
 * anything. Used by the filid-setup skill to render a checkbox UI.
 *
 * The filesystem (`.claude/rules/<filename>`) is the SINGLE source of truth:
 * - `deployed` → file exists on disk
 * - `selected` → `required || deployed` (used to pre-check the checkbox UI)
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
    return { entries: [], pluginRootResolved: false, manifestPath: null };
  }

  const manifestPath = join(root, 'templates', 'rules', 'manifest.json');
  let manifest: RuleDocsManifest;
  try {
    manifest = loadRuleDocsManifest(root);
  } catch (err) {
    log.error('failed to load rule docs manifest', err);
    return { entries: [], pluginRootResolved: true, manifestPath };
  }

  const resolvedRoot = resolveGitRoot(projectRoot);

  const entries: RuleDocStatusEntry[] = manifest.rules.map((entry) => {
    const destPath = join(
      resolvedRoot,
      '.claude',
      'rules',
      entry.filename,
    );
    const deployed = existsSync(destPath);
    const selected = entry.required || deployed;
    return {
      id: entry.id,
      filename: entry.filename,
      required: entry.required,
      title: entry.title,
      description: entry.description,
      deployed,
      selected,
    };
  });

  return { entries, pluginRootResolved: true, manifestPath };
}

/**
 * Synchronise `.claude/rules/` with the desired selection.
 *
 * Behaviour per entry:
 * - required OR selected + file absent → copy from plugin template
 * - required OR selected + file present → unchanged (user edits preserved)
 * - not selected + file present → removed
 * - not selected + file absent → unchanged
 *
 * This function MUST be invoked exclusively from the filid-setup skill. It is
 * safe to call repeatedly (idempotent relative to the selection input).
 *
 * @param projectRoot - Target project (git root resolved internally)
 * @param selection - Rule ids the user has explicitly opted into; required rules are enforced from the manifest
 * @param pluginRoot - Plugin root directory (defaults to CLAUDE_PLUGIN_ROOT)
 */
export function syncRuleDocs(
  projectRoot: string,
  selection: Iterable<string>,
  pluginRoot?: string,
): RuleDocSyncResult {
  const result: RuleDocSyncResult = {
    copied: [],
    removed: [],
    unchanged: [],
    skipped: [],
  };

  const root = resolvePluginRoot(pluginRoot);
  if (root === null) {
    result.skipped.push({
      id: '*',
      reason: 'CLAUDE_PLUGIN_ROOT not set and no pluginRoot provided',
    });
    return result;
  }

  let manifest: RuleDocsManifest;
  try {
    manifest = loadRuleDocsManifest(root);
  } catch (err) {
    result.skipped.push({
      id: '*',
      reason: `manifest load failed: ${(err as Error).message}`,
    });
    return result;
  }

  const resolvedRoot = resolveGitRoot(projectRoot);
  const rulesDir = join(resolvedRoot, '.claude', 'rules');
  const selectionSet = new Set(selection);

  for (const entry of manifest.rules) {
    const desired = entry.required || selectionSet.has(entry.id);
    const destPath = join(rulesDir, entry.filename);
    const templatePath = join(root, 'templates', 'rules', entry.filename);
    const destExists = existsSync(destPath);

    if (desired) {
      if (destExists) {
        result.unchanged.push(entry.filename);
        continue;
      }
      if (!existsSync(templatePath)) {
        result.skipped.push({
          id: entry.id,
          reason: `template missing at ${templatePath}`,
        });
        continue;
      }
      try {
        mkdirSync(rulesDir, { recursive: true });
        copyFileSync(templatePath, destPath);
        result.copied.push(entry.filename);
      } catch (err) {
        result.skipped.push({
          id: entry.id,
          reason: `copy failed: ${(err as Error).message}`,
        });
      }
      continue;
    }

    // not desired
    if (!destExists) {
      result.unchanged.push(entry.filename);
      continue;
    }
    try {
      unlinkSync(destPath);
      result.removed.push(entry.filename);
    } catch (err) {
      result.skipped.push({
        id: entry.id,
        reason: `remove failed: ${(err as Error).message}`,
      });
    }
  }

  return result;
}
