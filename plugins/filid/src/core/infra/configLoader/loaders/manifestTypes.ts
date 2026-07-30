import type { ConfigScope } from '@ogham/cross-platform';

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
   * `plugins/filid/scripts/syncRuleHashes.mjs` at build time; the runtime
   * uses it to detect drift against `.claude/rules/<filename>`.
   */
  templateHash: string;
}

/** Envelope for templates/rules/manifest.json. */
export interface RuleDocsManifest {
  version: string;
  rules: RuleDocEntry[];
}

/** Owned documents withdrawn from the layer the caller did not choose. */
export interface RetiredScopeReport {
  /** The layer they were withdrawn from — never the one just written. */
  scope: ConfigScope;
  /** Channel the documents were removed from, shown to the user as-is. */
  displayTarget: string;
  /** Filenames actually removed; the field is absent when this list is empty. */
  filenames: string[];
}

/** Report returned by syncRuleDocs. */
export interface RuleDocSyncResult {
  copied: string[];
  removed: string[];
  unchanged: string[];
  /** Artifacts whose content matched an older template and were overwritten
   * with the current template (required rules auto-update; optional rules
   * require an explicit id in the `resync` set). */
  updated: string[];
  /** Artifacts whose deployed content disagrees with the current template but
   * were left untouched — either the rule is optional and the caller did
   * not request resync, or the hash could not be computed. */
  drift: string[];
  skipped: Array<{ id: string; reason: string }>;
  /**
   * What the sync withdrew from the other layer so the documents live in one
   * place. Present only when the caller named a scope AND something was
   * actually removed — a caller that named no layer made no placement
   * decision, and an empty move is not worth reporting.
   */
  otherScope?: RetiredScopeReport;
}

/** Per-rule status snapshot used by the setup checkbox UI. */
export interface RuleDocStatusEntry {
  id: string;
  filename: string;
  /** Physical effective host target used for active inspection. */
  target: string;
  /** Portable project-relative effective target shown to users and agents. */
  displayTarget: string;
  /** Whether a current or legacy address supplies the active content. */
  source: 'current' | 'legacy' | null;
  required: boolean;
  title: string;
  description: string;
  /** Rule exists in the active host's directory or owned-section channel. */
  deployed: boolean;
  /**
   * Desired state for the checkbox UI. Optional entries preserve whether a
   * managed candidate stores the rule even when an effective Codex override
   * hides it. Required entries are never rendered in the checkbox UI (they
   * live in `RuleDocsStatus.autoDeployed`), so this field is always `true`
   * for entries in `autoDeployed`.
   */
  selected: boolean;
  /** SHA-256 of the host-channel form expected from the shipped template. */
  templateHash: string;
  /** SHA-256 of the active file/section body, or null when unavailable. */
  deployedHash: string | null;
  /** True iff `deployed` and `deployedHash === templateHash`. */
  inSync: boolean;
}

/** Result of getRuleDocsStatus. */
export interface RuleDocsStatus {
  /**
   * Optional rule entries — the ONLY list rendered as checkboxes in the
   * setup UI. Required entries are filtered out because they are
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
  /** Override for the plugin root (defaults to the host's plugin root). */
  pluginRoot?: string;
  /**
   * Which layer the documents are deployed to — the same choice that decides
   * where the config is written, so the user answers it once. `user` targets
   * the host state root, `project` the repository channel.
   *
   * Naming a layer is a placement decision: the sync writes it and then
   * withdraws the owned documents from the other layer, reporting them in
   * `otherScope`. Omitting it deploys to `project` and leaves the user layer
   * alone, so a headless call cannot silently erase a global deployment.
   */
  scope?: ConfigScope;
}
