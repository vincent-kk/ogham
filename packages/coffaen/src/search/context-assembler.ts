/**
 * @file context-assembler.ts
 * @description ContextAssembler — SA 결과를 AI 에이전트용 토큰 최적화 컨텍스트 블록으로 조립
 *
 * 핵심 가치: 최소 토큰으로 최대 맥락 전달 (AI 에이전트 Primary 사용자)
 * 출력 형태: 문서 경로 + Frontmatter 요약 + 관계 설명 + 활성화 점수
 */
import type { ActivationResult, KnowledgeGraph } from '../types/graph.js';

/** 컨텍스트 항목 */
export interface ContextItem {
  /** 문서 경로 */
  path: string;
  /** 문서 제목 */
  title: string;
  /** 활성화 점수 */
  score: number;
  /** Layer */
  layer: number;
  /** 태그 목록 */
  tags: string[];
  /** 시드로부터의 홉 거리 */
  hops: number;
  /** 관계 설명 (시드 기준) */
  relation: string;
  /** 전문 내용 (include_full 시) */
  fullContent?: string;
}

/** 컨텍스트 조립 옵션 */
export interface AssembleOptions {
  /** 토큰 예산 (기본: 2000) */
  tokenBudget?: number;
  /** 상위 N개 전문 포함 여부 (기본: false) */
  includeFull?: boolean;
  /** 전문 포함 최대 문서 수 (기본: 3) */
  maxFullDocuments?: number;
}

/** 컨텍스트 조립 결과 */
export interface AssembledContext {
  /** 마크다운 형식 컨텍스트 블록 */
  markdown: string;
  /** 포함된 항목 목록 */
  items: ContextItem[];
  /** 사용된 토큰 추정치 */
  estimatedTokens: number;
  /** 토큰 초과로 제거된 항목 수 */
  truncatedCount: number;
}

/**
 * 텍스트의 토큰 수를 추정한다.
 * 근사치: 단어 수 * 1.3 (영어 평균), 한국어 포함 시 * 1.5
 */
function estimateTokens(text: string): number {
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.ceil(wordCount * 1.5);
}

/**
 * Layer 번호를 사람이 읽기 쉬운 이름으로 변환한다.
 */
function layerName(layer: number): string {
  switch (layer) {
    case 1:
      return 'Core';
    case 2:
      return 'Derived';
    case 3:
      return 'External';
    case 4:
      return 'Action';
    default:
      return `L${layer}`;
  }
}

/**
 * 홉 거리 기반 관계 설명을 생성한다.
 */
function describeRelation(hops: number): string {
  switch (hops) {
    case 0:
      return 'seed';
    case 1:
      return 'direct link';
    case 2:
      return '2-hop';
    case 3:
      return '3-hop';
    default:
      return `${hops}-hop`;
  }
}

/**
 * ActivationResult 목록을 ContextItem 목록으로 변환한다.
 */
function toContextItems(
  results: ActivationResult[],
  graph: KnowledgeGraph,
): ContextItem[] {
  const items: ContextItem[] = [];

  for (const result of results) {
    const node = graph.nodes.get(result.nodeId);
    if (!node) continue;

    items.push({
      path: node.path,
      title: node.title,
      score: result.score,
      layer: node.layer as number,
      tags: node.tags,
      hops: result.hops,
      relation: describeRelation(result.hops),
    });
  }

  return items;
}

/**
 * ContextItem을 마크다운 줄로 직렬화한다.
 */
function itemToMarkdown(item: ContextItem, includeFull: boolean): string {
  const scoreStr = item.score.toFixed(3);
  const tagsStr = item.tags.slice(0, 5).join(', ');
  const header = `- **[${item.title}](${item.path})** (L${item.layer}-${layerName(item.layer)}, score=${scoreStr}, ${item.relation})`;
  const meta = `  - tags: ${tagsStr || '(none)'}`;

  if (includeFull && item.fullContent) {
    const contentPreview = item.fullContent.slice(0, 500);
    return `${header}\n${meta}\n  \`\`\`\n  ${contentPreview}\n  \`\`\``;
  }

  return `${header}\n${meta}`;
}

/**
 * SA 결과를 AI 에이전트용 컨텍스트 블록으로 조립한다.
 *
 * @param results - SA 결과 (score 내림차순)
 * @param graph - 지식 그래프
 * @param options - 조립 옵션
 * @returns 조립된 컨텍스트
 */
export function assembleContext(
  results: ActivationResult[],
  graph: KnowledgeGraph,
  options: AssembleOptions = {},
): AssembledContext {
  const {
    tokenBudget = 2000,
    includeFull = false,
    maxFullDocuments = 3,
  } = options;

  const allItems = toContextItems(results, graph);

  // 토큰 예산 내에서 항목 선택
  const selectedItems: ContextItem[] = [];
  let totalTokens = 0;
  let truncatedCount = 0;

  const headerTokens = estimateTokens('## coffaen Knowledge Context\n\n');
  totalTokens += headerTokens;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const itemText = itemToMarkdown(item, false);
    const itemTokens = estimateTokens(itemText);

    if (totalTokens + itemTokens > tokenBudget) {
      truncatedCount = allItems.length - i;
      break;
    }

    selectedItems.push(item);
    totalTokens += itemTokens;
  }

  // 전문 포함 (상위 N개)
  if (includeFull && selectedItems.length > 0) {
    const fullCount = Math.min(maxFullDocuments, selectedItems.length);
    for (let i = 0; i < fullCount; i++) {
      // 실제 파일 내용은 MCP 도구 계층에서 주입 (여기서는 플레이스홀더)
      selectedItems[i].fullContent = undefined;
    }
  }

  // 마크다운 조립
  const lines: string[] = ['## coffaen Knowledge Context', ''];

  if (selectedItems.length === 0) {
    lines.push('_관련 문서를 찾을 수 없습니다._');
  } else {
    lines.push(`_${selectedItems.length}개 문서 (score 내림차순)_`, '');
    for (const item of selectedItems) {
      lines.push(
        itemToMarkdown(item, includeFull && item.fullContent !== undefined),
      );
    }
  }

  if (truncatedCount > 0) {
    lines.push('', `_토큰 예산 초과로 ${truncatedCount}개 문서 제외_`);
  }

  const markdown = lines.join('\n');

  return {
    markdown,
    items: selectedItems,
    estimatedTokens: totalTokens,
    truncatedCount,
  };
}

/** ContextAssembler 클래스 */
export class ContextAssembler {
  private readonly defaultOptions: AssembleOptions;

  constructor(defaultOptions: AssembleOptions = {}) {
    this.defaultOptions = defaultOptions;
  }

  assemble(
    results: ActivationResult[],
    graph: KnowledgeGraph,
    options?: AssembleOptions,
  ): AssembledContext {
    return assembleContext(results, graph, {
      ...this.defaultOptions,
      ...options,
    });
  }
}
