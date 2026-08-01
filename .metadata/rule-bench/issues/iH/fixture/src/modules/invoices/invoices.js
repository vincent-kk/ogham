/**
 * Renders an invoice reference.
 * @param {string} number - invoice number such as "INV-1".
 * @returns {string} reference line
 */
export function invoiceRef(number) {
  return `ref:${number}`;
}
