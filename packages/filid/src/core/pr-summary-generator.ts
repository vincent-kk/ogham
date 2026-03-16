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
} from '../types/summary.js';

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

/**
 * 규칙 ID별 에러 확률 매핑.
 * BUILTIN_RULE_IDS (src/types/rules.ts) 기반.
 * RULE_TO_SEVERITY (src/core/drift-detector.ts)와 일관된 순서.
 * 값은 튜닝 가능한 초기값.
 */
export const RULE_ERROR_PROBABILITY: Record<string, number> = {
  'circular-dependency': 0.95,
  'pure-function-isolation': 0.9,
  'organ-no-intentmd': 0.85,
  'max-depth': 0.8,
  'zero-peer-file': 0.75, // RULE_TO_SEVERITY에 없음, 신규 할당
  'index-barrel-pattern': 0.6,
  'module-entry-point': 0.55,
  'naming-convention': 0.2,
};

/** fix-requests.md의 Severity 필드 기반 에러 확률 fallback. */
const SEVERITY_FALLBACK: Record<string, number> = {
  CRITICAL: 0.95,
  HIGH: 0.85,
  MEDIUM: 0.5,
  LOW: 0.2,
};

/** 알 수 없는 규칙/분류 불가 항목의 기본 에러 확률. */
const DEFAULT_ERROR_PROBABILITY = 0.5;

/** 자동 수정 가능 규칙 ID 목록 (drift-detector RULE_TO_ACTION 기반). */
const AUTO_FIXABLE_RULES = new Set([
  'naming-convention',
  'index-barrel-pattern',
  'module-entry-point',
]);

/** reviewItems 최대 개수. */
const MAX_REVIEW_ITEMS = 5;

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

/**
 * 파일 내용을 입력받아 인간 친화적 PR 요약을 생성한다.
 * 순수 함수: I/O 없음, 동일 입력 → 동일 출력 (generatedAt 제외).
 */
export function generateHumanSummary(
  input: GenerateSummaryInput,
): HumanSummary {
  const allItems: SummaryItem[] = [];
  const warnings: string[] = [];

  // 1. Parse structure-check.md
  if (input.structureCheckContent) {
    const fm = parseStructureCheckFrontmatter(input.structureCheckContent);
    if (fm) {
      for (const [stage, result] of Object.entries(fm.stageResults)) {
        if (result === 'FAIL') {
          allItems.push({
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
  }

  // 2. Parse fix-requests.md
  if (input.fixRequestsContent) {
    const fixItems = parseFixRequests(input.fixRequestsContent);
    for (const item of fixItems) {
      const ruleId = item.rule;
      const isAutoFixable = AUTO_FIXABLE_RULES.has(ruleId);
      allItems.push({
        severity: mapSeverity(item.severity),
        message:
          item.recommendedAction ||
          item.title ||
          `${item.id}: ${item.severity} 위반`,
        path: item.filePath || undefined,
        ruleId: ruleId || undefined,
        autoFixable: isAutoFixable,
        errorProbability: computeErrorProbability(ruleId, item.severity),
      });
    }
  }

  // 3. Extract verdict from review-report.md
  let verdict = 'UNKNOWN';
  if (input.reviewReportContent) {
    verdict = extractVerdict(input.reviewReportContent);
  }

  // 4. Override verdict with re-validate.md if present
  if (input.revalidateContent) {
    const revalidateVerdict = extractRevalidateVerdict(input.revalidateContent);
    if (revalidateVerdict !== 'UNKNOWN') {
      verdict = revalidateVerdict;
    }
  }

  // 5. Separate autoFixable items
  const autoFixItems = allItems.filter((item) => item.autoFixable);
  const manualItems = allItems.filter((item) => !item.autoFixable);

  // 6. Sort by errorProbability desc, take top 5
  manualItems.sort((a, b) => b.errorProbability - a.errorProbability);
  const reviewItems = manualItems.slice(0, MAX_REVIEW_ITEMS);

  // 7. If all clean, add pass item
  if (allItems.length === 0 && (verdict === 'APPROVED' || verdict === 'PASS')) {
    reviewItems.push({
      severity: 'pass',
      message: '모든 검증 통과',
      autoFixable: false,
      errorProbability: 0,
    });
  }

  // 8. Parsing warnings fallback
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

  const totalFindings = allItems.length;

  // 9. Render markdown
  const markdown = renderMarkdown(verdict, reviewItems, autoFixItems);

  return {
    branch: input.branch,
    generatedAt: new Date().toISOString(),
    verdict,
    reviewItems,
    autoFixItems,
    totalFindings,
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
