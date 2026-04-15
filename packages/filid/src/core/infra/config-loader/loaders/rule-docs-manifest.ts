import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
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
  /** Previous filename before the filid_ prefix rename. Used for migration. */
  legacyFilename?: string;
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
   * Desired state for the checkbox UI. For optional entries this equals
   * `deployed`; required entries are never rendered in the checkbox UI
   * (they live in `RuleDocsStatus.autoDeployed`), so this field is
   * always `true` for entries in `autoDeployed`.
   */
  selected: boolean;
}

/** Result of getRuleDocsStatus. */
export interface RuleDocsStatus {
  /**
   * Optional rule entries — the ONLY list rendered as checkboxes in the
   * filid-setup UI. Required entries are filtered out because they are
   * auto-synced regardless of user input.
   */
  entries: RuleDocStatusEntry[];
  /**
   * Required rule entries — auto-deployed by `syncRuleDocs` regardless
   * of user selection. Surfaced here so the skill can include them in
   * the summary report, but NEVER rendered in the checkbox UI.
   */
  autoDeployed: RuleDocStatusEntry[];
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
    const destPath = join(
      resolvedRoot,
      '.claude',
      'rules',
      entry.filename,
    );
    // Also check legacy filename for transition period — a legacy file
    // counts as "deployed" until the user runs filid-setup to migrate.
    const legacyPath = entry.legacyFilename
      ? join(resolvedRoot, '.claude', 'rules', entry.legacyFilename)
      : null;
    const deployed = existsSync(destPath) || (legacyPath !== null && existsSync(legacyPath));
    const statusEntry: RuleDocStatusEntry = {
      id: entry.id,
      filename: entry.filename,
      required: entry.required,
      title: entry.title,
      description: entry.description,
      deployed,
      selected: entry.required ? true : deployed,
    };
    if (entry.required) {
      autoDeployed.push(statusEntry);
    } else {
      entries.push(statusEntry);
    }
  }

  return { entries, autoDeployed, pluginRootResolved: true, manifestPath };
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

  // --- Legacy filename migration ---
  // Rename old-named files (e.g. fca.md → filid_fca-policy.md)
  // so the main loop sees them under the current name. User edits are preserved
  // because renameSync is a metadata-only operation (no content rewrite).
  for (const entry of manifest.rules) {
    if (!entry.legacyFilename) continue;
    const legacyPath = join(rulesDir, entry.legacyFilename);
    const newPath = join(rulesDir, entry.filename);
    if (existsSync(legacyPath) && !existsSync(newPath)) {
      try {
        renameSync(legacyPath, newPath);
        log.debug(`migrated rule doc: ${entry.legacyFilename} → ${entry.filename}`);
      } catch (err) {
        log.error(`failed to migrate ${entry.legacyFilename}`, err);
      }
    }
  }

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
