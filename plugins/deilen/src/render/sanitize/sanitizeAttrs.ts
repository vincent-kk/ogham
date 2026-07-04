import {
  INTERNAL_GLOBAL_ATTRS,
  INTERNAL_TAG_ATTRS,
  SAFE_STYLE_PATTERN,
  TAG_ATTRS,
  type SanitizeProfile,
} from "./allowlist.js";
import { decodeEntities } from "./decodeEntities.js";
import { isSafeUrl } from "./isSafeUrl.js";

const ATTRIBUTE_PATTERN =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

const ENTITY_BY_CHARACTERS = {
  "&": "&amp;",
  '"': "&quot;",
  "<": "&lt;",
  ">": "&gt;",
} as const;

// Derived from the map keys so the class and the lookup cannot drift apart.
// Keys must stay free of character-class metacharacters (]-^\).
const ATTRIBUTE_ESCAPE_PATTERN = new RegExp(
  `[${Object.keys(ENTITY_BY_CHARACTERS).join("")}]`,
  "g",
);

function escapeAttributeValue(value: string): string {
  return value.replace(
    ATTRIBUTE_ESCAPE_PATTERN,
    (character) =>
      ENTITY_BY_CHARACTERS[character as keyof typeof ENTITY_BY_CHARACTERS],
  );
}

/**
 * Keep only allowlisted attributes for `tag`; the `raw` profile additionally
 * rejects deilen-internal attrs (class, data-*). Values are entity-decoded
 * before safety checks (URL scheme, style) and fully re-escaped on output, so
 * obfuscated schemes cannot survive and quoting cannot be broken.
 */
export function sanitizeAttrs(
  tag: string,
  rawAttributes: string,
  profile: SanitizeProfile,
): string {
  const allowed = TAG_ATTRS[tag];
  const internal = profile === "rendered" ? INTERNAL_TAG_ATTRS[tag] : undefined;
  const out: string[] = [];
  for (const attributeMatch of rawAttributes.matchAll(ATTRIBUTE_PATTERN)) {
    const name = attributeMatch[1].toLowerCase();
    const isInternalGlobal =
      profile === "rendered" && INTERNAL_GLOBAL_ATTRS.has(name);
    if (!isInternalGlobal && !allowed?.has(name) && !internal?.has(name))
      continue;
    const value = decodeEntities(
      attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? "",
    );
    if (name === "href" && !isSafeUrl(value, false)) continue;
    if (name === "src" && !isSafeUrl(value, tag === "img")) continue;
    if (name === "style" && !SAFE_STYLE_PATTERN.test(value.trim())) continue;
    out.push(`${name}="${escapeAttributeValue(value)}"`);
  }
  return out.join(" ");
}
