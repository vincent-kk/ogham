/**
 * Parses the `## Links` section of a GitHub issue body.
 * Grammar: `- <linkType>: <refList>` where linkType ∈
 * {blocks, blocked-by, split-from, split-into, relates}.
 */

type ValidLinkType =
  | 'blocks'
  | 'blocked-by'
  | 'split-from'
  | 'split-into'
  | 'relates';

const VALID_LINK_TYPES = new Set<ValidLinkType>([
  'blocks',
  'blocked-by',
  'split-from',
  'split-into',
  'relates',
]);

export type GithubLinks = Partial<Record<ValidLinkType, string[]>>;

export function parseLinks(body: string): GithubLinks {
  if (!body) return {};

  const headerIdx = findLinksHeader(body);
  if (headerIdx < 0) return {};

  const lines = body.slice(headerIdx).split('\n');
  const result: GithubLinks = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^#{1,2}\s/.test(line)) break;

    const trimmed = line.trim();
    if (!trimmed.startsWith('- ')) continue;

    const content = trimmed.slice(2).trim();
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

    const existing = result[linkType];
    if (existing) {
      for (const ref of refs) {
        if (!existing.includes(ref)) existing.push(ref);
      }
    } else {
      result[linkType] = refs;
    }
  }

  return result;
}

function findLinksHeader(body: string): number {
  const lines = body.split('\n');
  let pos = 0;
  for (const line of lines) {
    if (line.trimEnd() === '## Links') return pos;
    pos += line.length + 1;
  }
  return -1;
}
