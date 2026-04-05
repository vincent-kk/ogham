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

function parseLinkLine(
  line: string
): { type: ValidLinkType; refs: string[] } | null {
  if (/^#{1,2}\s/.test(line)) return null; // caller must treat as boundary
  const trimmed = line.trim();
  if (!trimmed.startsWith('- ')) return null;
  const content = trimmed.slice(2).trim();
  const colonIdx = content.indexOf(':');
  if (colonIdx < 0) return null;
  const rawType = content.slice(0, colonIdx).trim();
  const rawRefs = content.slice(colonIdx + 1).trim();
  if (!rawType || !rawRefs) return null;
  if (!VALID_LINK_TYPES.has(rawType as ValidLinkType)) {
    console.warn(`[parseLinks] unknown linkType "${rawType}" — skipping`);
    return null;
  }
  const refs = rawRefs
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
  return refs.length ? { type: rawType as ValidLinkType, refs } : null;
}

function mergeRefs(existing: string[], incoming: string[]): void {
  for (const ref of incoming) {
    if (!existing.includes(ref)) existing.push(ref);
  }
}

export function parseLinks(body: string): GithubLinks {
  if (!body) return {};
  const headerIdx = findLinksHeader(body);
  if (headerIdx < 0) return {};
  const lines = body.slice(headerIdx).split('\n');
  const result: GithubLinks = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^#{1,2}\s/.test(line)) break; // next h2 boundary
    const parsed = parseLinkLine(line);
    if (!parsed) continue;
    const existing = result[parsed.type];
    if (existing) mergeRefs(existing, parsed.refs);
    else result[parsed.type] = parsed.refs;
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
