/** A markdown image src that points at a local file (a `file://` URI). */
export function isLocalImageSrc(src: string): boolean {
  return /^file:\/\//i.test(src.trim());
}
