import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

/**
 * Read the commit identity from a revalidation report with a recognized verdict.
 * @param reportPath Absolute report path within the resolved review directory.
 * @returns A full Git SHA, or null for absent, ambiguous or invalid report metadata.
 * @throws When the report exists but cannot be read.
 */
export function readRevalidationHead(reportPath: string): string | null {
  const report = readUtf8FileIfExistsSync(reportPath);
  const frontmatter = report?.match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u,
  )?.[1];
  if (!frontmatter) return null;

  const metadata = new Map<string, string>();
  for (const line of frontmatter.split(/\r?\n/u)) {
    const entry = line.match(/^([a-z_]+): (.*)$/u);
    if (!entry || metadata.has(entry[1]!)) return null;
    metadata.set(entry[1]!, entry[2]!);
  }
  const verdict = metadata.get('verdict') ?? '';
  if (!/^(?:PASS|FAIL|INCONCLUSIVE)$/u.test(verdict)) return null;
  const head = metadata.get('head_sha');
  return head && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(head) ? head : null;
}
