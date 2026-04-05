/**
 * @file kg-context.ts
 * @description kg_context 도구 핸들러 — 토큰 최적화 컨텍스트 블록 반환
 */
import { readVaultFile } from '../../../core/vault-scanner/vault-scanner.js';
import {
  assembleContext,
  extractBestSnippet,
} from '../../../search/context-assembler/context-assembler.js';
import { query } from '../../../search/query-engine/query-engine.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import type { KgContextInput, KgContextResult } from '../../../types/mcp.js';

/**
 * kg_context 핸들러
 */
export async function handleKgContext(
  graph: KnowledgeGraph | null,
  input: KgContextInput,
  vaultRoot?: string,
): Promise<KgContextResult | { error: string }> {
  if (!graph) {
    return {
      error: 'Index not built. Please run /maencof:maencof-build first.',
    };
  }

  const tokenBudget = input.token_budget ?? 2000;
  const includeFull = input.include_full ?? false;
  const queryTerms = input.query.split(/\s+/).filter((t) => t.length > 0);

  // 쿼리 실행
  const queryResult = query(graph, queryTerms, {
    maxResults: 20,
    decay: 0.7,
    threshold: 0.05,
    maxHops: 5,
  });

  // 컨텍스트 조립
  const assembled = assembleContext(queryResult.results, graph, {
    tokenBudget,
    includeFull,
  });

  // Content snippet extraction (B4-lite)
  if (includeFull && vaultRoot && assembled.items.length > 0) {
    const maxFullDocuments = 3;
    const topItems = assembled.items.slice(0, maxFullDocuments);

    await Promise.all(
      topItems.map(async (item) => {
        try {
          const content = await readVaultFile(vaultRoot, item.path);
          item.fullContent = extractBestSnippet(content, queryTerms);
        } catch {
          // File not found or read error — skip snippet
        }
      }),
    );

    // Rebuild markdown with snippets appended
    const snippetLines: string[] = [];
    for (const item of topItems) {
      if (item.fullContent) {
        snippetLines.push(
          `\n### ${item.title}\n\`\`\`\n${item.fullContent}\n\`\`\``,
        );
      }
    }
    if (snippetLines.length > 0) {
      return {
        context: assembled.markdown + '\n' + snippetLines.join('\n'),
        documentCount: assembled.items.length,
        estimatedTokens: assembled.estimatedTokens,
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
