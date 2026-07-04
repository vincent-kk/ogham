import { ALLOWED_TAGS, type SanitizeProfile } from "./allowlist.js";
import { sanitizeAttrs } from "./sanitizeAttrs.js";

const TAG_PATTERN =
  /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
// Comments, CDATA, declarations (<!DOCTYPE …>), processing instructions —
// removed before the tag pass so splicing cannot assemble a tag that skips it.
// Unterminated constructs swallow to end of input, mirroring browser parsing.
const NON_TAG_PATTERN =
  /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<[!?][^>]*(?:>|$)/g;
// script/style are dropped with their contents, not just their tags.
const RAW_TEXT_PATTERN =
  /<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?(?:<\/\1\s*>|$)/gi;
const SENTINEL = String.fromCharCode(0x00);
// `<` and the sentinel are disjoint, so one pass is equivalent to escaping
// every remaining `<` and then restoring sentinels back to `<`.
const ESCAPE_OR_RESTORE_PATTERN = new RegExp(`[<${SENTINEL}]`, "g");

/**
 * Allowlist HTML sanitizer — with markdown-it `html:true` this is the sole XSS
 * barrier. Disallowed tags are dropped while inner text is preserved (except
 * script/style, removed with contents); comments/declarations are removed;
 * disallowed attributes and dangerous URL schemes are stripped. Sanctioned tags
 * are re-emitted via a sentinel and every remaining `<` is escaped, so no
 * unvetted markup (e.g. an unclosed tag re-parsed by the browser as attribute
 * soup) can reach the output. The `raw` profile (author-supplied HTML) also
 * rejects deilen-internal class/data-* attrs.
 */
export function sanitizeHtml(
  html: string,
  profile: SanitizeProfile = "rendered",
): string {
  const cleaned = html
    .replaceAll(SENTINEL, "")
    .replace(NON_TAG_PATTERN, "")
    .replace(RAW_TEXT_PATTERN, "")
    .replace(
      TAG_PATTERN,
      (_match, slash: string, rawName: string, rawAttributes: string) => {
        const name = rawName.toLowerCase();
        if (!ALLOWED_TAGS.has(name)) return "";
        if (slash === "/") return `${SENTINEL}/${name}>`;
        const attributes = sanitizeAttrs(name, rawAttributes, profile);
        return attributes
          ? `${SENTINEL}${name} ${attributes}>`
          : `${SENTINEL}${name}>`;
      },
    );
  return cleaned.replace(ESCAPE_OR_RESTORE_PATTERN, (character) =>
    character === "<" ? "&lt;" : "<",
  );
}
