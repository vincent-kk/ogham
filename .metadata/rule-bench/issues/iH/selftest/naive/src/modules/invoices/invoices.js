const iso = (date) => date.toISOString().slice(0, 10);

/**
 * Renders an invoice reference.
 * @param {string} number - invoice number such as "INV-1".
 * @returns {string} reference line
 */
export function invoiceRef(number) {
  return `ref:${number}`;
}

/**
 * Renders a dated invoice header.
 * @param {string} number - invoice number.
 * @param {Date} date - invoice date.
 * @returns {string} dated header line
 */
export function invoiceHeader(number, date) {
  return `${number} (${iso(date)})`;
}
