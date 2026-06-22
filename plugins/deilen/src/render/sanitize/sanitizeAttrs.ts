import { GLOBAL_ATTRS, SAFE_STYLE_RE, TAG_ATTRS } from "./allowlist.js";
import { isSafeUrl } from "./isSafeUrl.js";

const ATTR_RE =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

/**
 * Keep only allowlisted attributes for `tag`, dropping dangerous URL schemes and
 * non-text-align styles. Input comes from markdown-it (already HTML-escaped), so
 * values are re-emitted verbatim apart from quote-escaping.
 */
export function sanitizeAttrs(tag: string, rawAttrs: string): string {
  const allowed = TAG_ATTRS[tag];
  const out: string[] = [];
  for (const m of rawAttrs.matchAll(ATTR_RE)) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    if (!GLOBAL_ATTRS.has(name) && !allowed?.has(name)) continue;
    if (name === "href" && !isSafeUrl(value, false)) continue;
    if (name === "src" && !isSafeUrl(value, tag === "img")) continue;
    if (name === "style" && !SAFE_STYLE_RE.test(value.trim())) continue;
    out.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
  }
  return out.join(" ");
}
