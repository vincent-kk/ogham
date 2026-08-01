/**
 * Uppercases the first character of a string.
 * @param {string} value - non-empty string.
 * @returns {string} value with its first letter uppercased
 */
export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
