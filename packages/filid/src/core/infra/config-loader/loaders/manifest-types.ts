/** Single entry in templates/rules/manifest.json. */
export interface RuleDocEntry {
  id: string;
  filename: string;
  /** Previous filename before the filid_ prefix rename. Used for migration. */
  legacyFilename?: string;
  required: boolean;
  title: string;
  description: string;
  /**
   * SHA-256 hex digest of the template file shipped in
   * `templates/rules/<filename>`. Injected by
   * `packages/filid/scripts/sync-rule-hashes.mjs` at build time; the runtime
   * uses it to detect drift against `.claude/rules/<filename>`.
   */
  templateHash: string;
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
  /** Files whose content matched an older template and were overwritten
   * with the current template (required rules auto-update; optional rules
   * require an explicit id in the `resync` set). */
  updated: string[];
  /** Files whose deployed content disagrees with the current template but
   * were left untouched — either the rule is optional and the caller did
   * not request resync, or the hash could not be computed. */
  drift: string[];
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
  /** SHA-256 hex of the plugin-shipped template. Mirrors manifest value. */
  templateHash: string;
  /** SHA-256 hex of the deployed file, or null when not deployed or unreadable. */
  deployedHash: string | null;
  /** True iff `deployed` and `deployedHash === templateHash`. */
  inSync: boolean;
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

/** Options for `syncRuleDocs`. */
export interface SyncRuleDocsOptions {
  /** Rule ids whose drifted deployed files should be overwritten with the
   *  current template. Required rules auto-resync regardless of this set. */
  resync?: Iterable<string>;
  /** Override for the plugin root (defaults to CLAUDE_PLUGIN_ROOT). */
  pluginRoot?: string;
}
