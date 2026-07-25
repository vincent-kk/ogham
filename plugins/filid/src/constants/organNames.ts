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

// Docs-as-code compartments (references, docs, plans, skills, agents, ...)
// are deliberately absent: the set is open, and a name shipped here silently
// reclassifies a real code module of that name as an organ, muting the rules
// that would otherwise apply to it. Projects declare their own via the
// `additional-organ-names` config key. Leaf compartments need no entry at
// all — classification priority 6 already makes them organs.
export const KNOWN_ORGAN_DIR_NAMES: readonly string[] = [
  ...ORGAN_BASE_NAMES,
  ...TEST_ORGAN_NAMES,
] as const;
