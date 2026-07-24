import type { RuleDocAction } from '../../../types/manifest.js';

/** Observable facts about one rule doc at decision time. */
export interface RuleDocFacts {
  /** User opted this rule in. seiri has no required rules. */
  selected: boolean;
  /** User asked for this rule's local edits to be overwritten. */
  resync: boolean;
  /** A file already exists at the deployment path. */
  destExists: boolean;
  /** SHA-256 of the deployed file, or null when absent or unreadable. */
  deployedHash: string | null;
  /** SHA-256 recorded in the manifest for the shipped template. */
  templateHash: string;
  /** The shipped template is present on disk. */
  templateExists: boolean;
}

/** What should happen, and what the caller must do to make it happen. */
export interface RuleDocDecision {
  action: RuleDocAction;
  reason?: string;
  /** Copy the template over the deployment path. */
  write: boolean;
  /** Delete the deployment path. */
  remove: boolean;
}

/**
 * Decide one rule doc's fate from facts alone — no I/O, no filesystem.
 *
 * Plan (dry-run) and apply both route through this function so the diff
 * the user approves is produced by the same judgment that later executes.
 * If the two branched, the preview would eventually lie, and a preview
 * that lies is worse than no preview.
 */
export function decideRuleDocAction(facts: RuleDocFacts): RuleDocDecision {
  const { selected, resync, destExists, deployedHash, templateHash } = facts;

  if (!selected)
    return destExists
      ? { action: 'remove', write: false, remove: true }
      : { action: 'unchanged', write: false, remove: false };

  if (!facts.templateExists)
    return {
      action: 'skip',
      reason: 'template missing from the plugin',
      write: false,
      remove: false,
    };

  if (!destExists) return { action: 'copy', write: true, remove: false };

  // An unreadable deployed file yields a null hash. Treating that as drift
  // rather than as a match keeps an unreadable file from being silently
  // overwritten without the user asking for a resync.
  if (deployedHash !== null && deployedHash === templateHash)
    return { action: 'unchanged', write: false, remove: false };

  if (!resync)
    return {
      action: 'drift',
      reason: 'deployed file differs from the shipped template',
      write: false,
      remove: false,
    };

  return { action: 'update', write: true, remove: false };
}
