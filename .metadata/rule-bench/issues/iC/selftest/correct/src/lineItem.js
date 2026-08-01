import { formatCents } from './format/formatCents.js';

/**
 * Renders one receipt line.
 * @param {string} name - item label.
 * @param {number} cents - integer amount in cents.
 * @returns {string} rendered line
 */
export function lineItem(name, cents) {
  return `${name} — ${formatCents(cents)}`;
}
