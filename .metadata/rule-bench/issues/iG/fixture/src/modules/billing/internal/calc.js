/**
 * Computes an order total in cents.
 * @param {{price: number, qty?: number}[]} items - line items; qty defaults to 1.
 * @returns {number} total in cents
 */
export function computeTotal(items) {
  return items.reduce((sum, item) => sum + item.price * (item.qty ?? 1), 0);
}
