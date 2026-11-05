/**
 * Parses a complete decimal integer for final configuration schema validation.
 * @param value Optional environment text; surrounding whitespace, a sign and
 * leading zeros are accepted, but decimal fractions and suffixes are not.
 * @param fallback Value used only when the input is absent or blank.
 * @returns The integer or fallback; malformed input produces NaN so the caller's
 * configuration schema rejects it instead of silently substituting a default.
 */
export function intEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  return /^[+-]?\d+$/.test(value.trim()) ? Number(value) : Number.NaN;
}
