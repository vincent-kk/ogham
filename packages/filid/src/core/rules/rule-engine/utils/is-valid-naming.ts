import { KEBAB_CASE_RE, CAMEL_CASE_RE } from '../../../../constants/naming-patterns.js';

/** Returns true if the name follows kebab-case or camelCase. */
export function isValidNaming(name: string): boolean {
  return KEBAB_CASE_RE.test(name) || CAMEL_CASE_RE.test(name);
}
