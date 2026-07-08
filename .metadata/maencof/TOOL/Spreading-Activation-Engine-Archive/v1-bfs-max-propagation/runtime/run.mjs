/**
 * v1 격리본 단독 벤치마크 러너.
 *
 *   node run.mjs            — 품질 지표(nDCG@10/Recall@10/MRR) + 동결 기준선 대조 + 지연 측정
 *   node run.mjs --verbose  — 쿼리별 지표 상세 출력
 *
 * 동결 기준선(2026-07-08, kg_search 기본 파라미터: maxResults 10 / decay 0.7 /
 * threshold 0.1 / maxHops 5): ndcg10 0.8991 / recall10 0.8383 / mrr 1.0.
 * 이 수치 재현이 곧 이식 충실도의 증거다 — 불일치 시 exit 1.
 */
import { buildEvalGraph, GOLDEN_QUERIES } from './fixtureAndGolden.mjs';
import { query } from './queryPipeline.mjs';

const FROZEN_BASELINE = { ndcg10: 0.8991, recall10: 0.8383, mrr: 1.0 };
const LIVE_DEFAULTS = { maxResults: 10, decay: 0.7, threshold: 0.1, maxHops: 5 };
const K = 10;
const EPSILON = 0.0001;
const LATENCY_RUNS = 200;

function discountedGain(gains) {
  let sum = 0;
  for (let i = 0; i < gains.length; i++)
    sum += (Math.pow(2, gains[i]) - 1) / Math.log2(i + 2);

  return sum;
}

function ndcgAt(k, ranked, relevance) {
  const dcg = discountedGain(ranked.slice(0, k).map((p) => relevance[p] ?? 0));
  const ideal = Object.values(relevance)
    .filter((rel) => rel > 0)
    .sort((a, b) => b - a)
    .slice(0, k);
  const idcg = discountedGain(ideal);
  if (idcg === 0) return 0;
  return dcg / idcg;
}

function recallAt(k, ranked, relevance) {
  const relevantTotal = Object.values(relevance).filter((rel) => rel > 0).length;
  if (relevantTotal === 0) return 0;
  let hit = 0;
  for (const path of ranked.slice(0, k)) if ((relevance[path] ?? 0) > 0) hit++;

  return hit / relevantTotal;
}

function mrr(ranked, relevance) {
  for (let i = 0; i < ranked.length; i++)
    if ((relevance[ranked[i]] ?? 0) > 0) return 1 / (i + 1);

  return 0;
}

function round4(x) {
  return Math.round(x * 10000) / 10000;
}

const verbose = process.argv.includes('--verbose');
const graph = buildEvalGraph();

console.log(`[v1-archive] fixture graph: ${graph.nodeCount} nodes / ${graph.edgeCount} edges`);

let ndcgSum = 0;
let recallSum = 0;
let mrrSum = 0;
for (const gq of GOLDEN_QUERIES) {
  const { results } = query(graph, gq.seeds, LIVE_DEFAULTS);
  const ranked = results.map((r) => graph.nodes.get(r.nodeId)?.path ?? r.nodeId);
  const n = ndcgAt(K, ranked, gq.relevance);
  const r = recallAt(K, ranked, gq.relevance);
  const m = mrr(ranked, gq.relevance);
  ndcgSum += n;
  recallSum += r;
  mrrSum += m;
  if (verbose)
    console.log(
      `  ${gq.id.padEnd(24)} ndcg ${n.toFixed(4)}  recall ${r.toFixed(4)}  mrr ${m.toFixed(4)}`,
    );
}

const measured = {
  ndcg10: round4(ndcgSum / GOLDEN_QUERIES.length),
  recall10: round4(recallSum / GOLDEN_QUERIES.length),
  mrr: round4(mrrSum / GOLDEN_QUERIES.length),
};

console.log(`[v1-archive] measured : ${JSON.stringify(measured)}`);
console.log(`[v1-archive] frozen   : ${JSON.stringify(FROZEN_BASELINE)}`);

const start = process.hrtime.bigint();
for (let i = 0; i < LATENCY_RUNS; i++)
  for (const gq of GOLDEN_QUERIES) query(graph, gq.seeds, LIVE_DEFAULTS);

const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
const perQueryMs = elapsedMs / (LATENCY_RUNS * GOLDEN_QUERIES.length);
console.log(
  `[v1-archive] latency  : ${perQueryMs.toFixed(4)} ms/query (${LATENCY_RUNS}x${GOLDEN_QUERIES.length} runs)`,
);

const ok =
  Math.abs(measured.ndcg10 - FROZEN_BASELINE.ndcg10) <= EPSILON &&
  Math.abs(measured.recall10 - FROZEN_BASELINE.recall10) <= EPSILON &&
  Math.abs(measured.mrr - FROZEN_BASELINE.mrr) <= EPSILON;

if (ok) console.log('[v1-archive] FIDELITY OK — frozen baseline reproduced');
else {
  console.error('[v1-archive] FIDELITY MISMATCH — port deviates from frozen baseline');
  process.exit(1);
}
