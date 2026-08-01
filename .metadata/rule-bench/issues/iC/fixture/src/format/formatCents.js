/**
 * Formats an integer cent amount as a currency string.
 * @param {number} cents - integer amount in cents; may be negative.
 * @returns {string} e.g. 123456789 -> "$1,234,567.89", -450 -> "-$4.50"
 */
export function formatCents(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  const remainder = String(abs % 100).padStart(2, '0');
  return `${sign}$${dollars}.${remainder}`;
}
