/**
 * Strip markup, decode common entities, normalize space, and cap one digest field.
 * @param {string} value bounded structural HTML fragment
 * @param {number} limit maximum returned UTF-16 code units
 * @returns {string} plain bounded metadata text
 */
export function cleanHtmlText(value, limit) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, limit);
}
