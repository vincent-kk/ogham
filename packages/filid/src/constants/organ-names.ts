const ORGAN_BASE_NAMES: readonly string[] = [
  'components',
  'utils',
  'types',
  'hooks',
  'helpers',
  'lib',
  'styles',
  'assets',
  'constants',
] as const;

const TEST_ORGAN_NAMES: readonly string[] = [
  'test',
  'tests',
  'spec',
  'specs',
  'fixtures',
  'e2e',
] as const;

// Documentation/reference organs (no code, markdown-only content compartments
// used by Claude Code plugin skills and similar docs-as-code layouts).
const DOCS_ORGAN_NAMES: readonly string[] = ['references'] as const;

export const KNOWN_ORGAN_DIR_NAMES: readonly string[] = [
  ...ORGAN_BASE_NAMES,
  ...TEST_ORGAN_NAMES,
  ...DOCS_ORGAN_NAMES,
] as const;
