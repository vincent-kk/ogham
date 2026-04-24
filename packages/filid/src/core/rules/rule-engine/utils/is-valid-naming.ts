import {
  CAMEL_CASE_RE,
  KEBAB_CASE_RE,
  PASCAL_CASE_RE,
} from '../../../../constants/naming-patterns.js';

/** Returns true if the name follows camelCase (default), kebab-case, or PascalCase. */
export function isValidNaming(name: string): boolean {
  return (
    CAMEL_CASE_RE.test(name) ||
    KEBAB_CASE_RE.test(name) ||
    PASCAL_CASE_RE.test(name)
  );
}
