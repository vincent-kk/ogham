import { BUILTIN_RULE_IDS } from './builtinRuleIds.js';

/** Language-neutral path words used as routing hints, never as defect proof. */
export const REVIEW_RISK_PATH_WORDS = {
  /** Names commonly used for authentication, authorization, and trust controls. */
  'security-path': [
    'auth',
    'authentication',
    'authorization',
    'permission',
    'permissions',
    'credential',
    'credentials',
    'oauth',
    'rbac',
    'acl',
    'csrf',
    'jwt',
    'cryptography',
    'encryption',
  ],
  /** Names commonly used for synchronization and shared-state coordination. */
  'concurrency-path': [
    'mutex',
    'semaphore',
    'lock',
    'locks',
    'locking',
    'atomic',
    'transaction',
    'transactions',
    'concurrency',
    'concurrent',
    'synchronization',
  ],
} as const;

/** FCA evidence that warrants independent review of a changed public boundary. */
export const REVIEW_RISK_BOUNDARY_RULES: readonly string[] = [
  BUILTIN_RULE_IDS.EXTERNAL_IMPORT_BOUNDARY,
  BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
  BUILTIN_RULE_IDS.ENTRY_POINT_SURFACE,
];
