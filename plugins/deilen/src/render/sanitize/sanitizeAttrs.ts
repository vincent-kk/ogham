import {
  INTERNAL_GLOBAL_ATTRS,
  INTERNAL_TAG_ATTRS,
  SAFE_STYLE_RE,
  TAG_ATTRS,
  type SanitizeProfile,
} from "./allowlist.js";
import { decodeEntities } from "./decodeEntities.js";
import { isSafeUrl } from "./isSafeUrl.js";

const ATTR_RE =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function escapeAttrValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Keep only allowlisted attributes for `tag`; the `raw` profile additionally
 * rejects deilen-internal attrs (class, data-*). Values are entity-decoded
 * before safety checks (URL scheme, style) and fully re-escaped on output, so
 * obfuscated schemes cannot survive and quoting cannot be broken.
 */
export function sanitizeAttrs(
  tag: string,
  rawAttrs: string,
  profile: SanitizeProfile,
): string {
  const allowed = TAG_ATTRS[tag];
  const internal = profile === "rendered" ? INTERNAL_TAG_ATTRS[tag] : undefined;
  const out: string[] = [];
  for (const m of rawAttrs.matchAll(ATTR_RE)) {
    const name = m[1].toLowerCase();
    const isInternalGlobal =
      profile === "rendered" && INTERNAL_GLOBAL_ATTRS.has(name);
    if (!isInternalGlobal && !allowed?.has(name) && !internal?.has(name))
      continue;
    const value = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
    if (name === "href" && !isSafeUrl(value, false)) continue;
    if (name === "src" && !isSafeUrl(value, tag === "img")) continue;
    if (name === "style" && !SAFE_STYLE_RE.test(value.trim())) continue;
    out.push(`${name}="${escapeAttrValue(value)}"`);
  }
  return out.join(" ");
}
