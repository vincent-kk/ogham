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

  // Content snippet extraction (B4-lite)
  if (includeFull && vaultRoot && assembled.items.length > 0) {
    const maxFullDocuments = 3;
    const topItems = assembled.items.slice(0, maxFullDocuments);

    const snippetLines = (
      await Promise.all(
        topItems.map(async (item) => {
          try {
            const content = await readVaultFile(vaultRoot, item.path);
            const snippet = extractBestSnippet(content, queryTerms);
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
