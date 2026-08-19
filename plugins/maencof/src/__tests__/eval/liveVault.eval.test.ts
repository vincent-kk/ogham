/**
 * @file liveVault.eval.test.ts
 * @description T3 실볼트 로컬 러너 (설계서 03장) — env 로 지정한 vault 를 읽기 전용으로
 * 스캔·빌드해 프로브 질의의 시드 해석과 상위 결과를 보고한다. 개인 데이터 비커밋 원칙:
 * vault 경로와 프로브 모두 env 주입, graded 판정 없음(수동 리포트 전용), env 부재 시 skip.
 *
 * 실행:
 *   MAENCOF_EVAL_VAULT=<vault 경로> \
 *   MAENCOF_EVAL_PROBES=<프로브 JSON 경로> yarn maencof test:run liveVault
 * 프로브 JSON: { "searches": string[][], "contexts": string[] }
 *   searches — kg_search seed 배열 프로브, contexts — kg_context 자연어 프로브.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { selectContextCandidates } from '../../mcp/tools/kgContext/index.js';
import { query, resolveSeedNodes } from '../../search/queryEngine/index.js';
import type { NodeId } from '../../types/common.js';
import type { KnowledgeGraph } from '../../types/graph.js';

import { buildLiveGraph } from './buildLiveGraph.js';
import { LIVE_DEFAULTS } from './evalConstants.js';

const VAULT_PATH = process.env.MAENCOF_EVAL_VAULT;
const PROBES_PATH = process.env.MAENCOF_EVAL_PROBES;

interface ProbeSet {
  searches?: string[][];
  contexts?: string[];
}

function pathOf(graph: KnowledgeGraph, nodeId: NodeId): string {
  return graph.nodes.get(nodeId)?.path ?? String(nodeId);
}

function loadProbes(): ProbeSet {
  if (!PROBES_PATH) return {};
  return JSON.parse(readFileSync(PROBES_PATH, 'utf8')) as ProbeSet;
}

describe.skipIf(!VAULT_PATH)('T3 live vault report (read-only)', () => {
  it(
    'builds the vault graph and reports probe rankings',
    { timeout: 300_000 },
    async () => {
      const { graph, parseFailureCount } = await buildLiveGraph(VAULT_PATH!);
      console.log(
        `[t3] vault ${VAULT_PATH} — nodes ${graph.nodeCount}, edges ${graph.edgeCount}, parse failures ${parseFailureCount}`,
      );
      expect(graph.nodeCount).toBeGreaterThan(0);

      const probes = loadProbes();

      for (const seeds of probes.searches ?? []) {
        const label = JSON.stringify(seeds);
        const seedDiagnostics = resolveSeedNodes(graph, seeds)
          .scored.sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 5)
          .map(
            (s) =>
              `${s.matchScore.toFixed(4)} ${s.matchType} ${pathOf(graph, s.nodeId)}`,
          );
        console.log(`[t3] search ${label} seeds(top5):`);
        for (const line of seedDiagnostics) console.log(`[t3]   seed ${line}`);

        const { results } = query(graph, seeds, LIVE_DEFAULTS);
        console.log(`[t3] search ${label} top${results.length}:`);
        results.forEach((r, i) =>
          console.log(
            `[t3]   ${String(i + 1).padStart(2)}. ${r.score.toFixed(4)} ${pathOf(graph, r.nodeId)}`,
          ),
        );
        expect(Array.isArray(results)).toBe(true);
      }

      for (const rawQuery of probes.contexts ?? []) {
        const { candidates } = selectContextCandidates(graph, {
          query: rawQuery,
        });
        console.log(
          `[t3] context ${JSON.stringify(rawQuery)} top${Math.min(candidates.length, 10)}:`,
        );
        candidates
          .slice(0, 10)
          .forEach((r, i) =>
            console.log(
              `[t3]   ${String(i + 1).padStart(2)}. ${r.score.toFixed(4)} ${pathOf(graph, r.nodeId)}`,
            ),
          );
        expect(Array.isArray(candidates)).toBe(true);
      }
    },
  );
});
