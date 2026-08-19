/**
 * @file archivedSweep.eval.test.ts
 * @description ARCHIVED_SEED_MULTIPLIER 수렴 러너 — archived 스텁 시드 강등 계수를
 * 골든셋 위에서 전수 측정한다.
 *
 * 목적함수는 양방향이다: working(활성 문서가 정답 — 계수가 높으면 스텁 도배)과
 * archival(스텁이 정답 — 계수 0이면 시드 소멸로 회수가 죽고, 실코퍼스에선 낮은
 * 계수가 슬롯 경쟁에서 회수를 밀어낸다)이 반대로 움직이므로, 단일 최적값 선언
 * 대신 클래스별 곡선을 보고한다. 순위 표시는 working+archival 균등합을 쓰되 이는
 * 임의 가중이다 — 승격 결정은 곡선과 운영 우선순위(침강 vs 회수)를 보고 내린다.
 *
 * 계수 주입은 decaySweep 과 같은 모듈 경계 방식이다 — resolveKeywordSeed 가 상수를
 * 모듈에서 직접 읽으므로, 운영 타입에 스윕 파라미터를 열지 않고 측정 동안만
 * getter 로 갈아끼운다. 이 결합이 끊기면 아래 축 무결성 단언이 잡는다.
 *
 * 수렴 루프: 골든셋에 사례 추가 → 본 스윕 실행 → 곡선 근거로
 * constants/queryEngine.ts 승격 → `MAENCOF_EVAL_UPDATE_BASELINE=1` 재기록 → 같은
 * 커밋. 상세 리포트는 `MAENCOF_EVAL_ARCHIVED_SWEEP_REPORT=<path>` 지정 시 JSON 기록.
 */
import { writeFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { ARCHIVED_SEED_MULTIPLIER } from '../../constants/queryEngine.js';
import type { KnowledgeGraph } from '../../types/graph.js';

import type { EngineMetrics, SearchFn } from './engineMetrics.js';
import { LIVE_DEFAULTS } from './evalConstants.js';
import { buildEvalGraph } from './fixtureVault.js';
import type { GoldenQuery } from './goldenSet.js';
import { GOLDEN_QUERIES } from './goldenSet.js';
import { liveSearchFn } from './liveSearchFn.js';
import { measureRankings } from './measureRankings.js';

/**
 * 측정 중인 계수. `vi.mock` 팩토리는 호이스팅되므로 이 변수를 읽기만 하고,
 * 실제 값은 스윕 루프가 계수마다 갈아끼운다. null 이면 원본 상수.
 */
let activeMultiplier: number | null = null;

// 시드 해석기가 읽는 상수 모듈을 갈아끼운다. ARCHIVED_SEED_MULTIPLIER 만 getter 로
// 후보 값을 반영하고 나머지 export 는 원본이 지나간다.
vi.mock('../../constants/queryEngine.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../constants/queryEngine.js')>();
  return {
    ...actual,
    get ARCHIVED_SEED_MULTIPLIER(): number {
      return activeMultiplier ?? actual.ARCHIVED_SEED_MULTIPLIER;
    },
  };
});

/** 스윕 축 — 현행 기본값(0.3)을 반드시 포함해야 기본값 순위 비교가 성립한다 */
const GRID = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.7, 1.0] as const;

/** 기본값 대비 균등합이 이 이상 앞서야 승격 후보로 보고 */
const SWEEP_SIGNIFICANCE = 0.005;

/** kg_suggest_links 기본 min_score — tag-exact(0.5)×계수가 이 아래면 스텁은 제안에서 탈락 */
const SUGGEST_MIN_SCORE = 0.2;

/** 클래스별 골든 쿼리 — legacy 는 archived 픽스처와 무관해 축에서 평탄해야 한다 */
interface ClassifiedQueries {
  working: GoldenQuery[];
  archival: GoldenQuery[];
  legacy: GoldenQuery[];
}

/** 한 계수 지점의 클래스별 지표. legacy 는 해당 클래스가 없으면 null. */
interface SweepPoint {
  multiplier: number;
  working: EngineMetrics;
  archival: EngineMetrics;
  legacy: EngineMetrics | null;
}

/** GOLDEN_QUERIES 를 id prefix 규약(goldenSet 헤더)으로 3분한다 */
function classifyGoldenQueries(queries: GoldenQuery[]): ClassifiedQueries {
  return {
    working: queries.filter((q) => q.id.startsWith('archived-working-')),
    archival: queries.filter((q) => q.id.startsWith('archived-archival-')),
    legacy: queries.filter((q) => !q.id.startsWith('archived-')),
  };
}

/** 쿼리 부분집합에 대한 macro 지표 (measureSearchFn 은 전체 고정이라 부적합) */
function measureQueries(
  searchFn: SearchFn,
  queries: GoldenQuery[],
): EngineMetrics {
  return measureRankings(
    queries.map((gq) => ({ ranked: searchFn(gq.seeds), relevance: gq.relevance })),
  );
}

/**
 * 계수 하나를 적용한 상태로 클래스별 지표를 측정한다. 쿼리 캐시는 계수 적용 전후로
 * 비운다 — 캐시 키는 seeds + 옵션이라 모듈 상태 변화를 보지 못한다.
 *
 * @param multiplier - 측정할 강등 계수
 * @param graph - 평가용 그래프 (계수와 무관하게 재사용)
 * @param classes - 클래스별 골든 쿼리
 * @returns 계수 지점의 클래스별 지표
 */
async function measureAt(
  multiplier: number,
  graph: KnowledgeGraph,
  classes: ClassifiedQueries,
): Promise<SweepPoint> {
  const { invalidateQueryCache } = await import(
    '../../search/queryEngine/index.js'
  );
  activeMultiplier = multiplier;
  invalidateQueryCache();
  try {
    const searchFn = liveSearchFn(graph, LIVE_DEFAULTS);
    return {
      multiplier,
      working: measureQueries(searchFn, classes.working),
      archival: measureQueries(searchFn, classes.archival),
      legacy: classes.legacy.length
        ? measureQueries(searchFn, classes.legacy)
        : null,
    };
  } finally {
    activeMultiplier = null;
    invalidateQueryCache();
  }
}

/** 전체 그리드를 측정한다 — 픽스처·실볼트 모드가 공유하는 스윕 본체 */
async function sweepGrid(
  graph: KnowledgeGraph,
  classes: ClassifiedQueries,
): Promise<SweepPoint[]> {
  const points: SweepPoint[] = [];
  for (const multiplier of GRID)
    points.push(await measureAt(multiplier, graph, classes));
  return points;
}

/** 순위 표시용 균등합 — 임의 가중이며 승격 결정은 곡선으로 내린다 */
function rankKey(p: SweepPoint): number {
  return p.working.ndcg10 + p.archival.ndcg10;
}

function format(p: SweepPoint): string {
  const suggest =
    0.5 * p.multiplier >= SUGGEST_MIN_SCORE ? 'suggest:in' : 'suggest:out';
  const legacy = p.legacy ? ` | legacy ndcg ${p.legacy.ndcg10.toFixed(4)}` : '';
  return (
    `m=${p.multiplier.toFixed(2)} | working ndcg ${p.working.ndcg10.toFixed(4)} ` +
    `recall ${p.working.recall10.toFixed(4)} | archival ndcg ${p.archival.ndcg10.toFixed(4)} ` +
    `recall ${p.archival.recall10.toFixed(4)}${legacy} | ${suggest}`
  );
}

/** 스윕 결과를 보고하고 공통 무결성(축 생존·기본값 포함·승격 후보)을 단언한다 */
function reportAndAssert(points: SweepPoint[], label: string): void {
  // 축 무결성: working·archival 각각에서 계수가 지표를 움직여야 한다 — 평탄하면
  // 모듈 getter 가 엔진에서 떨어졌거나(스파이 탈락) 골든이 발화 경로를 잃은 것이다.
  for (const cls of ['working', 'archival'] as const)
    expect(
      new Set(points.map((p) => p[cls].ndcg10)).size,
      `${label}: ${cls} axis produced a single ndcg value across ${points.length} points — the multiplier is not reaching the engine, or the golden lost its observation point`,
    ).toBeGreaterThan(1);

  const current = points.find(
    (p) => p.multiplier === ARCHIVED_SEED_MULTIPLIER,
  );
  expect(current, 'grid must contain the current default').toBeDefined();

  const sorted = [...points].sort((a, b) => rankKey(b) - rankKey(a));
  const currentRank = sorted.indexOf(current!) + 1;
  console.log(
    `[eval:archived] ${label}: points ${points.length}, current default m=${ARCHIVED_SEED_MULTIPLIER} rank ${currentRank}/${points.length} (rank = working+archival ndcg 균등합)`,
  );
  for (const p of points) console.log(`[eval:archived] ${label}: ${format(p)}`);

  const best = sorted[0]!;
  const gain = rankKey(best) - rankKey(current!);
  if (gain >= SWEEP_SIGNIFICANCE && best.multiplier !== current!.multiplier)
    console.warn(
      `[eval:archived] ${label}: PROMOTION CANDIDATE m=${best.multiplier} beats default by combined ndcg10 +${gain.toFixed(4)} — 균등 가중 기준이므로 곡선을 보고 결정 후 ARCHIVED_SEED_MULTIPLIER 승격 + ratchet 재기록`,
    );

  const reportPath = process.env.MAENCOF_EVAL_ARCHIVED_SWEEP_REPORT;
  if (reportPath)
    writeFileSync(
      reportPath,
      `${JSON.stringify({ label, default: current, currentRank, points }, null, 2)}\n`,
    );
}

describe('archived multiplier sweep (fixture)', () => {
  it('grid-sweeps the multiplier and reports per-class curves', async () => {
    const graph = buildEvalGraph();
    const classes = classifyGoldenQueries(GOLDEN_QUERIES);
    expect(classes.working.length, 'fixture golden must carry working cases')
      .toBeGreaterThan(0);
    expect(classes.archival.length, 'fixture golden must carry archival cases')
      .toBeGreaterThan(0);

    const points = await sweepGrid(graph, classes);
    reportAndAssert(points, 'fixture');

    // 격리 무결성: legacy 골든은 archived 픽스처와 어휘가 분리되어 있어 계수 축에서
    // 평탄해야 한다 — 움직이면 archived 시나리오가 기존 케이스로 샌 것이다.
    expect(
      new Set(points.map((p) => p.legacy!.ndcg10)).size,
      'legacy queries moved along the multiplier axis — the archived fixtures leaked into pre-existing golden cases',
    ).toBe(1);
  });
});
