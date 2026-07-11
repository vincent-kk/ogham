// Test-case growth gate: max cases per spec.ts. Tunable — the 3/12 split
// is a convention, not absolute; only the MAX_TEST_CASES total is enforced.
export const MAX_BASIC_CASES = 3;
export const MAX_COMPLEX_CASES = 12;
export const MAX_TEST_CASES = MAX_BASIC_CASES + MAX_COMPLEX_CASES;
export const CC_THRESHOLD = 15;
export const LCOM4_SPLIT_THRESHOLD = 2;
export const DEFAULT_STABILITY_DAYS = 90;
