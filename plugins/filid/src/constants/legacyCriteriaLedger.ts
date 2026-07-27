import { RULE_SCOPES } from './ruleScopes.js';

export const LEGACY_CRITERIA_LEDGER_PATH_COMPONENTS = {
  DIRECTORY: '.filid',
  BASENAME: 'criteria.md',
} as const;

export const LEGACY_CRITERIA_LEDGER_RULE = {
  NAME: 'Legacy Criteria Ledger',
  DESCRIPTION:
    'Legacy acceptance criteria ledgers migrate into the root DETAIL contract.',
  CATEGORY: 'documentation',
  SEVERITY: 'warning',
  SCOPE: RULE_SCOPES.DOCUMENTS,
  GRANULARITY: 'project',
  FOUND_MESSAGE:
    'Legacy acceptance criteria ledger requires migration into DETAIL.md.',
  SNAPSHOT_REQUIRED_MESSAGE:
    'Legacy criteria ledger evaluation requires a project snapshot.',
  SUGGESTION_PREFIX: 'Move the legacy acceptance claims into',
} as const;
