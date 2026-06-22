/**
 * Allow relative/anchor URLs and the `http`/`https`/`mailto` schemes. For image
 * `src` (allowDataImage), also allow `data:image/`. Everything else — notably
 * `javascript:`/`vbscript:`/`data:text/html` — is rejected.
 */
export function isSafeUrl(value: string, allowDataImage: boolean): boolean {
  const v = value.trim();
  if (v === "") return false;
  if (
    v.startsWith("#") ||
    v.startsWith("/") ||
    v.startsWith("./") ||
    v.startsWith("../")
  ) {
    return true;
  }
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(v);
  if (!schemeMatch) return true;
  const scheme = schemeMatch[1].toLowerCase();
  if (scheme === "http" || scheme === "https" || scheme === "mailto") {
    return true;
  }
  if (allowDataImage && /^data:image\//i.test(v)) return true;
  return false;
}
