import { ALLOWED_TAGS } from "./allowlist.js";
import { sanitizeAttrs } from "./sanitizeAttrs.js";

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

/**
 * Allowlist HTML sanitizer for markdown-it output (already well-formed and
 * text-escaped). Disallowed tags are dropped while inner text is preserved;
 * disallowed attributes and dangerous URL schemes are stripped. Second XSS
 * layer after markdown-it `html:false`.
 */
export function sanitizeHtml(html: string): string {
  return html.replace(
    TAG_RE,
    (_match, slash: string, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return "";
      if (slash === "/") return `</${name}>`;
      const attrs = sanitizeAttrs(name, rawAttrs);
      return attrs ? `<${name} ${attrs}>` : `<${name}>`;
    },
  );
}
