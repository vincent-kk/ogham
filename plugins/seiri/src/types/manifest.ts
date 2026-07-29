import type { SeiriConfigScope } from './config.js';

/** Single entry in templates/rules/manifest.json. */
export interface RuleDocEntry {
  id: string;
  filename: string;
  title: string;
  description: string;
  /**
   * Offered pre-checked to a project that has deployed nothing yet.
   * A suggestion, not a requirement — seiri has no required rules, because
   * a rule applied without being chosen is the kind of blanket enforcement
   * the plugin exists to avoid.
   */
  recommended?: boolean;
  /**
   * SHA-256 hex digest of the template shipped in
   * `templates/rules/<filename>`, injected by
   * `scripts/sync-rule-hashes.mjs` at build time. The runtime compares it
   * against the current host channel to detect local edits.
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
  /** Physical host target used for inspection. */
  target: string;
  /** Portable project-relative target shown to users and agents. */
  displayTarget: string;
  /** Whether the current or a legacy address supplied the deployed content. */
  source: 'current' | 'legacy' | null;
  title: string;
  description: string;
  /** Mirrors the manifest; drives the pre-checked default on a fresh project. */
  recommended: boolean;
  /** The rule exists in a managed candidate, preserving UI selection/relocation. */
  deployed: boolean;
  /** The current host actually reads the rule from its effective target. */
  active: boolean;
  /** Physical effective target that the host currently reads. */
  activeTarget: string;
  /** Portable effective target shown in hook reporting. */
  activeDisplayTarget: string;
  /** Hash of the effective rule content, or null when the rule is hidden. */
  activeDeployedHash: string | null;
  /** Whether the effective rule content matches the shipped template. */
  activeInSync: boolean;
  /** Whether a current or legacy marker supplies the effective content. */
  activeSource: 'current' | 'legacy' | null;
  /** Host-normalized SHA-256 hex of the plugin-shipped template. */
  templateHash: string;
  /** SHA-256 hex of the canonical-first stored copy, or null when absent. */
  deployedHash: string | null;
  /** True iff the canonical-first stored copy matches the template. */
  inSync: boolean;
}

/** What a sync would do, or did do, to one rule doc. */
export type RuleDocAction =
  'copy' | 'remove' | 'update' | 'unchanged' | 'drift' | 'skip';

/** One line of a sync plan or sync report. */
export interface RuleDocOutcome {
  id: string;
  filename: string;
  action: RuleDocAction;
  /** Why the entry was skipped, or what the drift consists of. */
  reason?: string;
}

/**
 * Owned rule documents found at one layer's channel.
 *
 * Only ever describes the layer a sync did *not* target, which is why the
 * field carrying it is named for the other scope rather than the chosen one.
 */
export interface RuleDocScopeReport {
  /** The layer these documents sit in. */
  scope: SeiriConfigScope;
  /**
   * Absolute path of that layer's rule channel — the directory a Claude host
   * fills, or the instruction file a Codex host writes its owned section
   * into. Absolute rather than layer-relative because the two layers have
   * different roots: `rules` alone would not say which one.
   */
  displayTarget: string;
  /** Filenames of this owner's documents found there, never another owner's. */
  filenames: readonly string[];
}

/**
 * Result of planning or applying a sync. `applied` distinguishes a
 * dry-run preview from a report of writes that actually happened.
 */
export interface RuleDocSyncResult {
  applied: boolean;
  outcomes: RuleDocOutcome[];
  /** Opaque target + intent revision returned by preview and successful apply. */
  revision?: string;
  /**
   * Owned rule documents still deployed at the layer that was not chosen.
   * A preview lists what saving would remove; an apply lists what it removed.
   * Absent when the other layer has no rule channel or holds nothing of this
   * owner's — there is no move to warn about.
   */
  otherScope?: RuleDocScopeReport;
}

/** Options shared by the plan and apply paths. */
export interface SyncRuleDocsOptions {
  /**
   * Rule ids whose drifted deployed file should be overwritten with the
   * current template. Ids absent from this set keep their local edits and
   * are reported as `drift` instead.
   */
  resync?: Iterable<string>;
  /**
   * Optional preview revision to require before applying. Presence with
   * `null` means no valid preview has completed and therefore cannot write.
   */
  revision?: string | null;
  /** Override for the plugin root (defaults to the host's plugin root). */
  pluginRoot?: string;
  /**
   * Which layer the rule documents are deployed to. `project` — the default,
   * because every existing deployment sits there — writes the repository
   * channel; `user` writes the host state root, where the rules reach every
   * project. Switching layers moves the documents rather than copying them:
   * see `otherScope` on the result for what a save would remove, or removed.
   */
  scope?: SeiriConfigScope;
}
