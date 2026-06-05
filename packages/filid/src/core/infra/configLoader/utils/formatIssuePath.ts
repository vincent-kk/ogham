type PathSegment = string | number;

/**
 * Render a `ZodIssue.path` array into a dotted/indexed string such as
 * `rules["zero-peer-file"].exempt[0]`. Exposed because the loader and
 * `validateConfigPatch` both format issue paths for user-facing error
 * messages.
 */
export function formatIssuePath(path: ReadonlyArray<PathSegment>): string {
  if (path.length === 0) return '<root>';
  return path
    .map((seg, idx) =>
      typeof seg === 'number' ? `[${seg}]` : idx === 0 ? seg : `.${seg}`,
    )
    .join('');
}
