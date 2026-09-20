/**
 * Diagnostic codes of dependency evidence a file could not confirm. Each names
 * a cause the dependency graph attributes to that file in `unknownFiles`.
 */
export const DEPENDENCY_DIAGNOSTIC_CODES = {
  UNCERTAIN: 'uncertain-local-dependency',
  UNRESOLVED: 'unresolved-local-dependency',
  UNOWNED: 'unowned-local-dependency',
  SYMLINK_NOT_FOLLOWED: 'symlink-not-followed',
  ADAPTER_DIVERGENCE: 'facts-adapter-divergence',
} as const;
