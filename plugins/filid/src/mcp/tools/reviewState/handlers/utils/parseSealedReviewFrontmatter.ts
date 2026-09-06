/** Leading flat metadata block supporting canonical LF and portable CRLF. */
const SEALED_FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

/** Supported line endings inside sealed artifact frontmatter. */
const METADATA_NEWLINE_PATTERN = /\r?\n/u;

/** One lowercase flat scalar entry admitted by sealed review artifacts. */
const METADATA_ENTRY_PATTERN = /^([a-z_]+): (.*)$/u;

/**
 * Parse unique flat scalar metadata from the leading frontmatter block.
 * @param artifact Complete canonical Markdown artifact bytes.
 * @returns Unique metadata entries, or null for malformed or duplicate fields.
 */
export function parseSealedReviewFrontmatter(
  artifact: string,
): ReadonlyMap<string, string> | null {
  const frontmatter = artifact.match(SEALED_FRONTMATTER_PATTERN)?.[1];
  if (!frontmatter) return null;
  const metadata = new Map<string, string>();
  for (const line of frontmatter.split(METADATA_NEWLINE_PATTERN)) {
    const entry = line.match(METADATA_ENTRY_PATTERN);
    if (!entry || metadata.has(entry[1]!)) return null;
    metadata.set(entry[1]!, entry[2]!);
  }
  return metadata;
}
