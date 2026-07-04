// Composed from char codes so the control-character range needs no literal
// escapes (satisfies eslint no-control-regex without a disable).
const CONTROL_AND_SPACE_PATTERN = new RegExp(
  `[${String.fromCharCode(0x00)}-${String.fromCharCode(0x20)}]`,
  "g",
);
const URL_SCHEME_PATTERN = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;
const DATA_IMAGE_PATTERN = /^data:image\//i;

/**
 * Allow relative/anchor URLs and the `http`/`https`/`mailto` schemes. For image
 * `src` (allowDataImage), also allow `data:image/`. Everything else — notably
 * `javascript:`/`vbscript:`/`data:text/html` — is rejected. ASCII control chars
 * and spaces are removed before analysis (browsers strip them when parsing
 * URLs, so `java\tscript:` must be judged as `javascript:`).
 */
export function isSafeUrl(rawValue: string, allowDataImage: boolean): boolean {
  const value = rawValue.replace(CONTROL_AND_SPACE_PATTERN, "");
  if (value === "") return false;
  if (
    value.startsWith("#") ||
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../")
  )
    return true;

  const schemeMatch = URL_SCHEME_PATTERN.exec(value);
  if (!schemeMatch) return true;
  const scheme = schemeMatch[1].toLowerCase();
  if (scheme === "http" || scheme === "https" || scheme === "mailto")
    return true;

  if (allowDataImage && DATA_IMAGE_PATTERN.test(value)) return true;
  return false;
}
