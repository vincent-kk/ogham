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

export const KNOWN_ORGAN_DIR_NAMES: readonly string[] = [
  ...ORGAN_BASE_NAMES,
  'test',
  'tests',
  'spec',
  'specs',
  'fixtures',
  'e2e',
] as const;
