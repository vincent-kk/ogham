/**
 * @file pr-summary-generator.ts
 * @description PR 검증 결과를 파싱하여 인간 친화적 요약(HumanSummary)을 생성한다.
 *
 * 순수 함수 지향: 파일 내용을 문자열로 받아 HumanSummary를 반환한다.
 * I/O는 호출측(MCP handler)이 담당한다.
 */
import type {
  HumanSummary,
  SummaryItem,
  SummaryItemSeverity,
} from '../../types/summary.js';
import {
  RULE_ERROR_PROBABILITY,
  SEVERITY_FALLBACK,
  DEFAULT_ERROR_PROBABILITY,
  AUTO_FIXABLE_RULES,
  MAX_REVIEW_ITEMS,
} from '../../constants/review-probabilities.js';

/** generateHumanSummary 입력. 각 파일의 내용을 문자열 또는 null로 전달한다. */
export interface GenerateSummaryInput {
  /** structure-check.md 내용 (없으면 null) */
  structureCheckContent: string | null;
  /** fix-requests.md 내용 (없으면 null) */
  fixRequestsContent: string | null;
  /** review-report.md 내용 (없으면 null) */
  reviewReportContent: string | null;
  /** re-validate.md 내용 (없으면 null) */
  revalidateContent: string | null;
  /** 브랜치 이름 */
  branch: string;
}

export { RULE_ERROR_PROBABILITY };

/** structure-check.md YAML frontmatter 파싱 결과. */
interface StructureCheckFrontmatter {
  stageResults: Record<string, string>;
  criticalCount: number;
  overall: string;
}

/** fix-requests.md에서 파싱한 단일 항목. */
interface FixRequestItem {
  id: string;
  title: string;
  severity: string;
  source: string;
  filePath: string;
  rule: string;
  recommendedAction: string;
}

/**
 * structure-check.md의 YAML frontmatter를 파싱한다.
 * 파싱 실패 시 null을 반환한다 (graceful degradation).
 */
export function parseStructureCheckFrontmatter(
  content: string,
): StructureCheckFrontmatter | null {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const yaml = fmMatch[1];

  const stageResults: Record<string, string> = {};
  const stageBlock = yaml.match(/stage_results:\n((?:\s+\w+:.*\n)*)/);
  if (stageBlock) {
    const lines = stageBlock[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^\s+(\w+):\s*(PASS|FAIL|SKIP)/);
      if (match) {
        stageResults[match[1]] = match[2];
      }
    }
  }

  const ccMatch = yaml.match(/critical_count:\s*(\d+)/);
  const criticalCount = ccMatch ? parseInt(ccMatch[1], 10) : 0;

  const overallMatch = yaml.match(/overall:\s*(PASS|FAIL)/);
  const overall = overallMatch ? overallMatch[1] : 'UNKNOWN';

  return { stageResults, criticalCount, overall };
}

/**
 * fix-requests.md에서 FIX-XXX 블록들을 파싱한다.
 * 파싱 실패 시 빈 배열을 반환한다 (graceful degradation).
 */
export function parseFixRequests(content: string): FixRequestItem[] {
  const items: FixRequestItem[] = [];

  const blocks = content.split(/^## (FIX-\d+):\s*/m);

  for (let i = 1; i < blocks.length; i += 2) {
    const id = blocks[i];
    const body = blocks[i + 1] ?? '';

    const titleLine = body.split('\n')[0]?.trim() ?? '';

    const severity =
      body.match(/-\s*\*\*Severity\*\*:\s*(\w+)/)?.[1] ?? 'MEDIUM';
    const source =
      body.match(/-\s*\*\*Source\*\*:\s*([\w-]+)/)?.[1] ?? 'unknown';
    const filePath =
      body.match(/-\s*\*\*Path\*\*:\s*`?([^`\n]+)`?/)?.[1]?.trim() ?? '';
    const rule = body.match(/-\s*\*\*Rule\*\*:\s*([\w-]+)/)?.[1] ?? '';
    const recommendedAction =
      body.match(/-\s*\*\*Recommended Action\*\*:\s*(.+)/)?.[1]?.trim() ??
      titleLine;

    items.push({
      id,
      title: titleLine,
      severity: severity.toUpperCase(),
      source,
      filePath,
      rule,
      recommendedAction,
    });
  }

  return items;
}

/**
 * review-report.md에서 verdict를 추출한다.
 */
function extractVerdict(content: string): string {
  const match = content.match(
    /\*\*Verdict\*\*:\s*(APPROVED|REQUEST_CHANGES|INCONCLUSIVE)/,
  );
  return match?.[1] ?? 'UNKNOWN';
}

/**
 * re-validate.md에서 verdict를 추출한다.
 */
function extractRevalidateVerdict(content: string): string {
  const headerMatch = content.match(/—\s*(PASS|FAIL)/);
  if (headerMatch) return headerMatch[1];

  const verdictMatch = content.match(/\*\*Verdict\*\*:\s*(PASS|FAIL)/);
  if (verdictMatch) return verdictMatch[1];

  const finalMatch = content.match(/\*\*Final Verdict\*\*:\s*(PASS|FAIL)/);
  if (finalMatch) return finalMatch[1];

  return 'UNKNOWN';
}

/** SummaryItemSeverity를 fix-requests severity 문자열로부터 결정한다. */
function mapSeverity(severity: string): SummaryItemSeverity {
  switch (severity) {
    case 'CRITICAL':
      return 'critical';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
    case 'LOW':
    default:
      return 'info';
  }
}

/** 에러 확률을 계산한다. ruleId → RULE_ERROR_PROBABILITY → severity fallback → DEFAULT. */
function computeErrorProbability(ruleId: string, severity: string): number {
  if (ruleId && RULE_ERROR_PROBABILITY[ruleId] !== undefined) {
    return RULE_ERROR_PROBABILITY[ruleId];
  }
  if (severity && SEVERITY_FALLBACK[severity] !== undefined) {
    return SEVERITY_FALLBACK[severity];
  }
  return DEFAULT_ERROR_PROBABILITY;
}

/** structure-check.md에서 FAIL 스테이지를 SummaryItem으로 변환한다. */
function collectStructureItems(content: string): {
  items: SummaryItem[];
  warnings: string[];
} {
  const items: SummaryItem[] = [];
  const warnings: string[] = [];
  const fm = parseStructureCheckFrontmatter(content);
  if (fm) {
    for (const [stage, result] of Object.entries(fm.stageResults)) {
      if (result === 'FAIL') {
        items.push({
          severity: 'warning',
          message: `${stage} 검증 실패`,
          autoFixable: false,
          errorProbability: 0.7,
        });
      }
    }
  } else {
    warnings.push('structure-check.md frontmatter 파싱 실패');
  }
  return { items, warnings };
}

/** fix-requests.md에서 항목들을 SummaryItem으로 변환한다. */
function collectFixRequestItems(content: string): SummaryItem[] {
  const fixItems = parseFixRequests(content);
  return fixItems.map((item) => {
    const ruleId = item.rule;
    return {
      severity: mapSeverity(item.severity),
      message:
        item.recommendedAction ||
        item.title ||
        `${item.id}: ${item.severity} 위반`,
      path: item.filePath || undefined,
      ruleId: ruleId || undefined,
      autoFixable: AUTO_FIXABLE_RULES.has(ruleId),
      errorProbability: computeErrorProbability(ruleId, item.severity),
    };
  });
}

/** review-report.md와 re-validate.md에서 최종 verdict를 결정한다. */
function resolveVerdict(
  reviewReportContent: string | null,
  revalidateContent: string | null,
): string {
  let verdict = 'UNKNOWN';
  if (reviewReportContent) {
    verdict = extractVerdict(reviewReportContent);
  }
  if (revalidateContent) {
    const revalidateVerdict = extractRevalidateVerdict(revalidateContent);
    if (revalidateVerdict !== 'UNKNOWN') {
      verdict = revalidateVerdict;
    }
  }
  return verdict;
}

/**
 * 파일 내용을 입력받아 인간 친화적 PR 요약을 생성한다.
 * 순수 함수: I/O 없음, 동일 입력 → 동일 출력 (generatedAt 제외).
 */
export function generateHumanSummary(
  input: GenerateSummaryInput,
): HumanSummary {
  const allItems: SummaryItem[] = [];
  let warnings: string[] = [];

  if (input.structureCheckContent) {
    const result = collectStructureItems(input.structureCheckContent);
    allItems.push(...result.items);
    warnings = result.warnings;
  }

  if (input.fixRequestsContent) {
    allItems.push(...collectFixRequestItems(input.fixRequestsContent));
  }

  const verdict = resolveVerdict(
    input.reviewReportContent,
    input.revalidateContent,
  );

  const autoFixItems = allItems.filter((item) => item.autoFixable);
  const manualItems = allItems.filter((item) => !item.autoFixable);
  manualItems.sort((a, b) => b.errorProbability - a.errorProbability);
  const reviewItems = manualItems.slice(0, MAX_REVIEW_ITEMS);

  if (allItems.length === 0 && (verdict === 'APPROVED' || verdict === 'PASS')) {
    reviewItems.push({
      severity: 'pass',
      message: '모든 검증 통과',
      autoFixable: false,
      errorProbability: 0,
    });
  }

  if (
    warnings.length > 0 &&
    reviewItems.length === 0 &&
    autoFixItems.length === 0
  ) {
    reviewItems.push({
      severity: 'info',
      message: `상세 항목 파싱 불가: ${warnings.join(', ')}`,
      autoFixable: false,
      errorProbability: 0,
    });
  }

  const markdown = renderMarkdown(verdict, reviewItems, autoFixItems);

  return {
    branch: input.branch,
    generatedAt: new Date().toISOString(),
    verdict,
    reviewItems,
    autoFixItems,
    totalFindings: allItems.length,
    markdown,
  };
}

/** HumanSummary를 마크다운으로 렌더링한다. */
function renderMarkdown(
  verdict: string,
  reviewItems: SummaryItem[],
  autoFixItems: SummaryItem[],
): string {
  const lines: string[] = [];

  lines.push('# PR Human Summary (filid 자동 생성)');
  lines.push('');

  if (reviewItems.length > 0) {
    lines.push('## 이 PR에서 확인해야 할 것:');
    for (let i = 0; i < reviewItems.length; i++) {
      const item = reviewItems[i];
      const emoji = severityEmoji(item.severity);
      const pathSuffix = item.path ? ` — \`${item.path}\`` : '';
      lines.push(`${i + 1}. ${emoji} ${item.message}${pathSuffix}`);
    }
    lines.push('');
  }

  if (autoFixItems.length > 0) {
    lines.push('## 자동 수정 가능 항목:');
    for (const item of autoFixItems) {
      const pathSuffix = item.path ? ` — \`${item.path}\`` : '';
      lines.push(`- 🔧 ${item.message}${pathSuffix}`);
    }
    lines.push('');
  }

  lines.push(`> Verdict: **${verdict}**`);

  return lines.join('\n');
}

function severityEmoji(severity: SummaryItemSeverity): string {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    case 'pass':
      return '✅';
  }
}
