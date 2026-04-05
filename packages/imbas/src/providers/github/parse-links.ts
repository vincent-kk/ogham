/**
 * @file parse-links.ts
 * @description Pure function that parses the `## Links` section from a GitHub
 *   issue body string into a typed GithubLinks record.
 *
 *   Grammar (from skills/manifest/references/github/link-handling.md):
 *     ## Links
 *     - <linkType>: <refList>
 *
 *   linkType ∈ {blocks, blocked-by, split-from, split-into, relates}
 *   refList: comma-separated #N or owner/repo#N references
 */

const VALID_LINK_TYPES = new Set([
  'blocks',
  'blocked-by',
  'split-from',
  'split-into',
  'relates',
] as const);

export type GithubLinks = Partial<
  Record<'blocks' | 'blocked-by' | 'split-from' | 'split-into' | 'relates', string[]>
>;

type ValidLinkType = 'blocks' | 'blocked-by' | 'split-from' | 'split-into' | 'relates';

/**
 * Parse the `## Links` section of a GitHub issue body.
 *
 * @param body - Full issue body string
 * @returns Parsed link map. Missing or empty section returns `{}`.
 */
export function parseLinks(body: string): GithubLinks {
  if (!body) return {};

  // Locate the ## Links section
  const linksHeaderIdx = findLinksHeader(body);
  if (linksHeaderIdx < 0) return {};

  // Extract lines from after the header until the next h2 or end of string
  const afterHeader = body.slice(linksHeaderIdx);
  const lines = afterHeader.split('\n');

  // Skip the header line itself
  const itemLines: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    // Stop at next h2 (## ...) or h1
    if (/^#{1,2}\s/.test(line)) break;
    itemLines.push(line);
  }

  const result: GithubLinks = {};

  for (const line of itemLines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('- ')) continue;

    const content = trimmed.slice(2).trim(); // remove "- "
    const colonIdx = content.indexOf(':');
    if (colonIdx < 0) continue;

    const rawType = content.slice(0, colonIdx).trim();
    const rawRefs = content.slice(colonIdx + 1).trim();

    if (!rawType || !rawRefs) continue;

    if (!VALID_LINK_TYPES.has(rawType as ValidLinkType)) {
      console.warn(
        `[parseLinks] unknown linkType "${rawType}" — skipping (forward-compat)`
      );
      continue;
    }

    const linkType = rawType as ValidLinkType;
    const refs = rawRefs
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (refs.length === 0) continue;

    // Merge duplicates (union)
    if (result[linkType]) {
      const existing = result[linkType]!;
      for (const ref of refs) {
        if (!existing.includes(ref)) {
          existing.push(ref);
        }
      }
    } else {
      result[linkType] = refs;
    }
  }

  return result;
}

/**
 * Find the start index of the `## Links` header line in body.
 * Matches `## Links` as a standalone h2 line (case-sensitive).
 */
function findLinksHeader(body: string): number {
  const lines = body.split('\n');
  let pos = 0;
  for (const line of lines) {
    if (line.trimEnd() === '## Links') {
      return pos;
    }
    pos += line.length + 1; // +1 for the '\n'
  }
  return -1;
}
