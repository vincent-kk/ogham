/** review-report.md의 YAML frontmatter 필드. 누락 필드는 빈 값으로 채운다. */
export interface ReviewReportFrontmatter {
  verdict: string;
  branch: string;
  baseRef: string;
  runId: string;
  committee: string[];
  generatedAt: string;
}

/**
 * review-report.md의 YAML frontmatter를 파싱한다.
 * frontmatter가 없으면 null을 반환한다 (graceful degradation).
 */
export function parseReviewReportFrontmatter(
  content: string,
): ReviewReportFrontmatter | null {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fields = new Map<string, string>();
  for (const line of fmMatch[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) fields.set(kv[1], kv[2].trim());
  }

  const committee = (fields.get('committee') ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    verdict: fields.get('verdict') ?? '',
    branch: fields.get('branch') ?? '',
    baseRef: fields.get('base_ref') ?? '',
    runId: fields.get('run_id') ?? '',
    committee,
    generatedAt: fields.get('generated_at') ?? '',
  };
}
