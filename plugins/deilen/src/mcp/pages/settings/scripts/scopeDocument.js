// Bundled into public/settings.html by scripts/buildSettingsHtml.mjs. Browser
// only: no package import, because a barrel drags its Node-only graph into the
// bundle (see INTENT.md "Never do").

/**
 * Narrow the collected form document to the paths the project layer overrides.
 *
 * The project file carries overrides alone, so every other key must be absent
 * rather than present-and-equal — an absent key is what falls back to the user
 * layer, and dropping a path from `overriddenPaths` is the clear-override act.
 *
 * @param {Record<string, unknown>} source - The full document the form collected.
 * @param {Iterable<string>} overriddenPaths - Dot paths the project layer owns.
 *   A path the document does not carry is skipped, so a stale entry cannot
 *   invent a key.
 * @returns {Record<string, unknown>} A new document holding only those paths.
 *   `source` is never mutated, and a parent object appears only when one of its
 *   descendants survives — an empty group would read back as an override.
 */
export function projectDocument(source, overriddenPaths) {
  const document = {};
  for (const path of overriddenPaths) {
    const segments = path.split(".");
    if (carries(source, segments)) copyInto(document, source, segments);
  }
  return document;
}

/**
 * Whether `source` holds a value at the whole segment chain.
 *
 * Asked before any writing so that a chain leaving the document cannot create
 * the parents it passed through on the way out.
 *
 * @param {Record<string, unknown>} source - The document to walk.
 * @param {string[]} segments - The dot path, outermost segment first.
 * @returns {boolean} True when every segment resolves; an array stops the walk,
 *   since it is replaced whole rather than descended into.
 */
function carries(source, segments) {
  let node = source;
  for (const segment of segments) {
    if (!isWalkable(node) || !Object.hasOwn(node, segment)) return false;
    node = node[segment];
  }
  return true;
}

/**
 * Copy the value at `segments` from `source` into `target`, creating the
 * parents the chain passes through. Only ever called for a chain `carries`
 * confirmed, so every parent it creates ends up holding a value.
 *
 * @param {Record<string, unknown>} target - The document being built up.
 * @param {Record<string, unknown>} source - The document the value is read from.
 * @param {string[]} segments - The dot path, outermost segment first.
 */
function copyInto(target, source, segments) {
  const leaf = segments[segments.length - 1];
  let from = source;
  let to = target;
  for (const segment of segments.slice(0, -1)) {
    from = from[segment];
    to = to[segment] ??= {};
  }
  to[leaf] = from[leaf];
}

/**
 * Whether a value's own keys can be walked into.
 *
 * @param {unknown} value - The candidate parent node.
 * @returns {boolean} True for a plain object; an array is a replacement unit.
 */
function isWalkable(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
