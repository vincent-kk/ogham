/**
 * @file pr-summary.ts
 * @description PR 검증 결과를 파싱하여 인간 친화적 요약(HumanSummary)을 생성한다.
 *
 * 순수 함수 지향: 파일 내용을 문자열로 받아 HumanSummary를 반환한다.
 * I/O는 호출측(MCP handler)이 담당한다.
 *
 * 주의: TypeScript의 `export *`는 type-only 심볼을 forwarding 하지 않는다.
 * 반드시 별도의 `export type *` 또는 명시적 `export type { X }`를 추가해야 한다.
 */
import type {
  HumanSummary,
  SummaryItem,
} from '../../types/summary.js';
import { RULE_ERROR_PROBABILITY, MAX_REVIEW_ITEMS } from '../../constants/review-probabilities.js';
import { collectStructureItems } from './aggregators/collect-structure-items.js';
import { collectFixRequestItems } from './aggregators/collect-fix-requests.js';
import { resolveVerdict } from './aggregators/resolve-verdict.js';
import { renderMarkdown } from './renderers/render-markdown.js';

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

// parsers
export { parseStructureCheckFrontmatter } from './parsers/parse-structure-check.js';
export { parseFixRequests } from './parsers/parse-fix-requests.js';

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
