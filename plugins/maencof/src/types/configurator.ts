/**
 * @file configurator.ts
 * @description Configurator agent types — settings validation, migration, and backup
 */

/** Severity level for configuration health check items */
export type ConfigHealthSeverity = 'error' | 'warning' | 'info';

/** Category of configuration issue */
export type ConfigIssueCategory =
  | 'deprecated-key'
  | 'invalid-json'
  | 'legacy-format'
  | 'missing-field'
  | 'invalid-frontmatter'
  | 'spec-violation'
  | 'hooks-mismatch';

/** A single configuration health check item */
export interface ConfigHealthItem {
  /** Issue category */
  category: ConfigIssueCategory;
  /** Severity level */
  severity: ConfigHealthSeverity;
  /** Affected file path (relative to CWD) */
  file: string;
  /** Human-readable description of the issue */
  message: string;
  /** Whether this issue can be auto-fixed */
  fixable: boolean;
  /** Suggested fix description (if fixable) */
  suggestion?: string;
}

/** Result of a full configuration health check */
export interface ConfigHealthReport {
  /** All detected issues */
  items: ConfigHealthItem[];
  /** Count by severity */
  errorCount: number;
  warningCount: number;
  infoCount: number;
  /** Number of auto-fixable issues */
  fixableCount: number;
  /** ISO 8601 timestamp of when the check was performed */
  checkedAt: string;
}

/** Configuration backup metadata */
export interface ConfigBackup {
  /** ISO 8601 timestamp of the backup */
  timestamp: string;
  /** Files included in this backup (relative paths) */
  files: string[];
  /** Reason for creating the backup */
  reason: string;
}

/** Managed configuration file targets */
export type ConfigTarget =
  | 'settings.json'
  | '.mcp.json'
  | 'CLAUDE.md'
  | 'rules'
  | 'skills'
  | 'agents'
  | 'lifecycle.json';

/** Migration action for deprecated/changed settings */
export interface MigrationAction {
  /** Source file */
  file: string;
  /** Deprecated key path (dot-notation) */
  oldKey: string;
  /** New key path (dot-notation), null if removed */
  newKey: string | null;
  /** Description of the change */
  description: string;
}
