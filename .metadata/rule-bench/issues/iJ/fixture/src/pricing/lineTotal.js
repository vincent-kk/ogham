/**
 * Computes one line's total price.
 * @param {{price: number, qty?: number}} item - line item; qty defaults to 1.
 * @returns {number} line total in cents
 */
export function lineTotal(item) {
  return item.price * (item.qty ?? 1);
}
