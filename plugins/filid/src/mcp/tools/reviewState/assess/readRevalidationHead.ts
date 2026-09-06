import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

/** Leading report frontmatter supporting both LF and CRLF line endings. */
const REVALIDATION_FRONTMATTER_PATTERN =
  /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

/** Report metadata line endings; standalone CR is not accepted as a separator. */
const METADATA_NEWLINE_PATTERN = /\r?\n/u;

/** Flat scalar metadata entry admitted by the revalidation report contract. */
const METADATA_ENTRY_PATTERN = /^([a-z_]+): (.*)$/u;

/** Final revalidation verdicts that can establish a completed report. */
const REVALIDATION_VERDICT_PATTERN = /^(?:PASS|FAIL|INCONCLUSIVE)$/u;

/** Full lowercase Git SHA-1 or SHA-256 identity required for HEAD evidence. */
const GIT_HEAD_SHA_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;

/**
 * Read the commit identity from a revalidation report with a recognized verdict.
 * @param reportPath Absolute report path within the resolved review directory.
 * @returns A full Git SHA, or null for absent, ambiguous or invalid report metadata.
 * @throws When the report exists but cannot be read.
 */
export function readRevalidationHead(reportPath: string): string | null {
  const report = readUtf8FileIfExistsSync(reportPath);
  const frontmatter = report?.match(REVALIDATION_FRONTMATTER_PATTERN)?.[1];
  if (!frontmatter) return null;

  const metadata = new Map<string, string>();
  for (const line of frontmatter.split(METADATA_NEWLINE_PATTERN)) {
    const entry = line.match(METADATA_ENTRY_PATTERN);
    if (!entry || metadata.has(entry[1]!)) return null;
    metadata.set(entry[1]!, entry[2]!);
  }
  const verdict = metadata.get('verdict') ?? '';
  if (!REVALIDATION_VERDICT_PATTERN.test(verdict)) return null;
  const head = metadata.get('head_sha');
  return head && GIT_HEAD_SHA_PATTERN.test(head) ? head : null;
}
