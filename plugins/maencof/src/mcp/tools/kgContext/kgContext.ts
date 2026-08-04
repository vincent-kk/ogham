/**
 * @file kgContext.ts
 * @description kg_context 도구 핸들러 — 토큰 최적화 컨텍스트 블록 반환
 */
import { readVaultFile } from '../../../core/vaultScanner/index.js';
import {
  assembleContext,
  estimateTokens,
  extractBestSnippet,
} from '../../../search/contextAssembler/index.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import type { KgContextInput, KgContextResult } from '../../../types/mcp.js';

import { selectContextCandidates } from './helpers/selectContextCandidates.js';

/** include_full 스니펫 대상 상위 문서 수 */
const SNIPPET_MAX_DOCUMENTS = 3;

/** 스니펫 문자 상한의 클램프 범위 — 하한은 종전 고정 상한과 같다 */
const SNIPPET_MIN_CHARS = 300;
const SNIPPET_MAX_CHARS = 1200;

/** estimateTokens(어절 수 × 1.5)의 토큰→문자 역산 — 한국어 어절(평균 3자+공백) 기준 보수 근사 */
const SNIPPET_CHARS_PER_TOKEN = 2.5;

/**
 * kg_context 핸들러
 */
export async function handleKgContext(
  graph: KnowledgeGraph | null,
  input: KgContextInput,
  vaultRoot?: string,
): Promise<KgContextResult | { error: string }> {
  if (!graph)
    return {
      error: 'Index not built. Please run /maencof:build first.',
    };

  const tokenBudget = input.token_budget ?? 2000;
  const includeFull = input.include_full ?? false;
  const queryTerms = input.query.split(/\s+/).filter((t) => t.length > 0);

  const candidates = selectContextCandidates(graph, input);

  // 경로-만 모드 — 조립 markdown 없이 선택 문서 참조만 반환한다
  if (input.include_content === false) {
    const documents = candidates.map((r) => {
      const node = graph.nodes.get(r.nodeId);
      return {
        path: String(r.nodeId),
        title: node?.title ?? String(r.nodeId),
        score: r.score,
      };
    });
    return { documents, documentCount: documents.length };
  }

  // 컨텍스트 조립
  const assembled = assembleContext(candidates, graph, { tokenBudget });

  // Content snippet extraction (B4-lite) — 잔여 예산이 없으면 시도하지 않는다
  const remainingTokens = tokenBudget - estimateTokens(assembled.markdown);
  if (
    includeFull &&
    vaultRoot &&
    assembled.items.length > 0 &&
    remainingTokens > 0
  ) {
    const topItems = assembled.items.slice(0, SNIPPET_MAX_DOCUMENTS);
    // 스니펫 상한은 잔여 예산을 문서 수로 나눠 정한다 — 종전 고정 300자는 하한으로 남는다
    const snippetMaxLength = Math.min(
      SNIPPET_MAX_CHARS,
      Math.max(
        SNIPPET_MIN_CHARS,
        Math.floor(
          (remainingTokens * SNIPPET_CHARS_PER_TOKEN) / topItems.length,
        ),
      ),
    );

    const snippetLines = (
      await Promise.all(
        topItems.map(async (item) => {
          try {
            const content = await readVaultFile(vaultRoot, item.path);
            const snippet = extractBestSnippet(
              content,
              queryTerms,
              snippetMaxLength,
            );
            return snippet
              ? `\n### ${item.title}\n\`\`\`\n${snippet}\n\`\`\``
              : null;
          } catch {
            // 파일 부재/읽기 실패 문서는 스니펫 없이 넘어간다
            return null;
          }
        }),
      )
    ).filter((line): line is string => line !== null);

    if (snippetLines.length > 0) {
      // 스니펫도 예산의 일부다 — 합계가 token_budget 을 넘으면 뒤 스니펫부터 덜어낸다
      let context = assembled.markdown + '\n' + snippetLines.join('\n');
      while (snippetLines.length > 0 && estimateTokens(context) > tokenBudget) {
        snippetLines.pop();
        context =
          snippetLines.length > 0
            ? assembled.markdown + '\n' + snippetLines.join('\n')
            : assembled.markdown;
      }
      return {
        context,
        documentCount: assembled.items.length,
        estimatedTokens: estimateTokens(context),
        truncatedCount: assembled.truncatedCount,
      };
    }
  }

  return {
    context: assembled.markdown,
    documentCount: assembled.items.length,
    estimatedTokens: assembled.estimatedTokens,
    truncatedCount: assembled.truncatedCount,
  };
}
