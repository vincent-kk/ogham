/**
 * Parse quoted or unquoted attributes from one bounded HTML start tag.
 * @param {string} tag bounded start-tag source
 * @returns {Record<string, string>} lowercase attribute map
 */
export function parseTagAttributes(tag) {
  const attributes = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(pattern)) {
    attributes[match[1].toLocaleLowerCase()] =
      match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
}
