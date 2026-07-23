import { parseReviewReportFrontmatter } from '../../../../../core/prSummary/index.js';

export interface ReportMetaSplit {
  /** frontmatter를 렌더링한 마크다운 표. frontmatter가 없으면 null. */
  metaTable: string | null;
  /** frontmatter를 제거한 리포트 본문. */
  body: string;
}

const code = (value: string): string => (value ? `\`${value}\`` : '');

/**
 * review-report.md를 메타데이터 표와 본문으로 분리한다.
 * 표는 접히는 <details> 밖에 노출되므로 본문에서는 frontmatter를 제거한다.
 */
export function splitReportMeta(content: string): ReportMetaSplit {
  const fm = parseReviewReportFrontmatter(content);
  if (!fm) return { metaTable: null, body: content };

  const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '');

  const rows: string[] = [];
  const push = (label: string, value: string): void => {
    if (value) rows.push(`| ${label} | ${value} |`);
  };

  push('Verdict', fm.verdict ? `**${fm.verdict}**` : '');
  push('Branch', code(fm.branch));
  push('Base', code(fm.baseRef));
  push('Run ID', code(fm.runId));
  push('Committee', fm.committee.map(code).join(' · '));
  push('Generated', code(fm.generatedAt));

  if (rows.length === 0) return { metaTable: null, body };

  return {
    metaTable: ['| Field | Value |', '| :--- | :--- |', ...rows].join('\n'),
    body,
  };
}
