/** Single entry in templates/rules/manifest.json. */
export interface RuleDocEntry {
  id: string;
  filename: string;
  title: string;
  description: string;
  /**
   * SHA-256 hex digest of the template shipped in
   * `templates/rules/<filename>`, injected by
   * `scripts/sync-rule-hashes.mjs` at build time. The runtime compares it
   * against the deployed `.claude/rules/<filename>` to detect local edits.
   */
  templateHash: string;
}

/** Envelope for templates/rules/manifest.json. */
export interface RuleDocsManifest {
  version: string;
  rules: RuleDocEntry[];
}

/** Per-rule snapshot used by the settings UI and the SessionStart render. */
export interface RuleDocStatus {
  id: string;
  filename: string;
  title: string;
  description: string;
  /** File currently exists under `.claude/rules/`. */
  deployed: boolean;
  /** SHA-256 hex of the plugin-shipped template. Mirrors the manifest. */
  templateHash: string;
  /** SHA-256 hex of the deployed file, or null when absent or unreadable. */
  deployedHash: string | null;
  /** True iff `deployed` and `deployedHash === templateHash`. */
  inSync: boolean;
}

/** What a sync would do, or did do, to one rule doc. */
export type RuleDocAction =
  | 'copy'
  | 'remove'
  | 'update'
  | 'unchanged'
  | 'drift'
  | 'skip';

/** One line of a sync plan or sync report. */
export interface RuleDocOutcome {
  id: string;
  filename: string;
  action: RuleDocAction;
  /** Why the entry was skipped, or what the drift consists of. */
  reason?: string;
}

/**
 * Result of planning or applying a sync. `applied` distinguishes a
 * dry-run preview from a report of writes that actually happened.
 */
export interface RuleDocSyncResult {
  applied: boolean;
  outcomes: RuleDocOutcome[];
}

/** Options shared by the plan and apply paths. */
export interface SyncRuleDocsOptions {
  /**
   * Rule ids whose drifted deployed file should be overwritten with the
   * current template. Ids absent from this set keep their local edits and
   * are reported as `drift` instead.
   */
  resync?: Iterable<string>;
  /** Override for the plugin root (defaults to the host's plugin root). */
  pluginRoot?: string;
}
