/**
 * Allow relative/anchor URLs and the `http`/`https`/`mailto` schemes. For image
 * `src` (allowDataImage), also allow `data:image/`. Everything else — notably
 * `javascript:`/`vbscript:`/`data:text/html` — is rejected. ASCII control chars
 * and spaces are removed before analysis (browsers strip them when parsing
 * URLs, so `java\tscript:` must be judged as `javascript:`).
 */
export function isSafeUrl(rawValue: string, allowDataImage: boolean): boolean {
  // eslint-disable-next-line no-control-regex
  const value = rawValue.replace(/[\u0000-\u0020]/g, "");
  if (value === "") return false;
  if (
    value.startsWith("#") ||
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../")
  )
    return true;

  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(value);
  if (!schemeMatch) return true;
  const scheme = schemeMatch[1].toLowerCase();
  if (scheme === "http" || scheme === "https" || scheme === "mailto")
    return true;

  if (allowDataImage && /^data:image\//i.test(value)) return true;
  return false;
}
