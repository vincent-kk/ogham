/**
 * Renders one receipt line.
 * @param {string} name - item label.
 * @param {number} cents - integer amount in cents.
 * @returns {string} rendered line
 */
export function lineItem(name, cents) {
  return `${name} — $${(cents / 100).toFixed(2)}`;
}
