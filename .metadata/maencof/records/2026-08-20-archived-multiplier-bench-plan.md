# ARCHIVED_SEED_MULTIPLIER 튜닝 벤치마크 — 실행 플랜

- **날짜**: 2026-08-20 · **브랜치**: `maencof/archive-layer`
- **목표**: `ARCHIVED_SEED_MULTIPLIER`(현행 0.3, `src/constants/queryEngine.ts:53` — 주석에 "운영 실측 후 조정 여지 있음")를 실측으로 튜닝할 수 있는 (1) 실볼트 참조 골든셋과 (2) 계수 스윕 벤치마크 구조를 만들고, 3면(픽스처·falias·tirnanog) 스윕을 1회 실측해 곡선을 보고한다. **계수 값 변경 자체는 범위 밖** — 곡선을 근거로 별도 결정한다.

## 배경 실측 (이 세션 도구 출력 근거)

- `archived`는 frontmatter 플래그다. `archiveExpired` 훅이 만료 문서를 `.maencof-meta/archive/`로 옮기고 레이어 위치에 태그 온전한 스텁(`archived: true` + `archive_path`)을 남긴다. `buildKnowledgeNode.ts:61`이 `fm.archived → node.archived` 전달.
- 강등 지점: `resolveKeywordSeed.ts:89` `score * idfScale * (node.archived ? ARCHIVED_SEED_MULTIPLIER : 1)`. 같은 상수를 `kgSuggestLinks.ts:123`도 사용(기본 `min_score` 0.2 — `kgSuggestLinks.ts:43`). path 시드에는 미적용.
- 실볼트 규모: falias 04_Action 스텁 41/활성 상위태그 `portfolio`(24)·`action`(16); tirnanog 04_Action 스텁 487/활성 382, 경쟁 태그 `security`(369 vs 312)·`cve`·`vulnerability`·`critical`. 두 vault 모두 `99_Archive`·`cluster_key` 사용 0.
- 기존 인프라: `decaySweep.eval.test.ts`(vi.mock 모듈 경계 스윕 + 축 무결성 단언 + PROMOTION 리포트), `liveVault.eval.test.ts`(env 주입 실볼트 러너, **개인 데이터 비커밋 원칙** — vault 경로·프로브 모두 env), `measureRankings(rankings) → EngineMetrics`, `LIVE_DEFAULTS { maxResults:10, decay:0.7, threshold:0.1, maxHops:5 }`, `GoldenQuery { id, seeds, relevance: Record<path,1|2> }`. fixtureVault에는 archived 문서가 0건(스윕 축이 발화하지 않음 → 보강 필수).

## 전역 제약 (모든 태스크 상속)

1. **개인 데이터 비커밋**: falias/tirnanog의 실제 경로·제목·태그를 리포 파일(픽스처·goldenSet·주석·커밋 메시지)에 싣지 않는다. 픽스처는 합성 어휘만. 실볼트 골든셋 JSON은 각 vault의 `.maencof-meta/eval/` 아래(리포 밖)에만 둔다.
2. **ratchet 규칙 3**: `goldenSet.ts` 쿼리 추가와 `baseline.json` 재기록(`MAENCOF_EVAL_UPDATE_BASELINE=1 yarn eval`)은 같은 커밋.
3. **운영 타입 불변**: `QueryOptions`·MCP 스키마에 스윕 파라미터를 열지 않는다 — 계수 주입은 decaySweep과 동일하게 vi.mock 모듈 경계에서만. `ARCHIVED_SEED_MULTIPLIER` 값도 불변.
4. 픽스처 신규 시나리오는 격리 원칙(전용 서브디렉토리 + 기존 픽스처에 없는 태그)을 따라 기존 골든 케이스의 IDF 파급을 최소화한다. 코퍼스 N 증가에 의한 미세 변동은 baseline 재기록 diff로 관찰·기록.
5. 커밋 단위: T0(플랜) → T1 → T2 → T3 각 1커밋. T4는 리포 밖 산출물(커밋 없음), T5는 측정·보고. 진행 원장은 이 파일 하단 `## Ledger`에 추기한다.

## 파일 맵

| 경로 | 조치 | 책임 |
| --- | --- | --- |
| `src/__tests__/eval/fixtureVault.ts` | 수정 | `FixtureDoc.archived?` + 전달 + cve-watch 경쟁/retro-incident 회수 시나리오 12건 |
| `src/__tests__/eval/goldenSet.ts` | 수정 | `archived-working-*` 2건 + `archived-archival-*` 1건 추가 |
| `src/__tests__/eval/baseline.json` | 재기록 | ratchet 기준선 (쿼리 29→32) |
| `src/__tests__/eval/buildLiveGraph.ts` | 신설 | `liveVault.eval.test.ts`의 `buildLiveGraph` 추출(동작 불변) |
| `src/__tests__/eval/liveVault.eval.test.ts` | 수정 | 추출된 `buildLiveGraph` import로 교체 |
| `src/__tests__/eval/archivedSweep.eval.test.ts` | 신설 | 계수 그리드 스윕 러너 — 픽스처 모드(상시) + 실볼트 graded 모드(env 조건) |
| `~/Soulstream/{falias,tirnanog}/.maencof-meta/eval/archived-golden.json` | 신설(리포 밖) | 실볼트 graded 골든셋 2벌 |

## T1 — 픽스처 archived 시나리오 + 골든 쿼리 + baseline 재기록

**fixtureVault.ts**: `FixtureDoc`에 `/** archived 스텁 — 시드 강등 계수 스윕의 발화 경로 (태그 온전, 본문 스텁) */ archived?: boolean;` 추가. `toKnowledgeNode`의 `if (doc.clusterKey) ...` 옆에 `if (doc.archived) node.archived = true;` 추가. `FIXTURE_DOCS` 말미(클러스터 블록 뒤)에 시나리오 블록 추가 — 실측 미러 주석: 수집형 vault 의 스텁:활성 경쟁(실측 ≈1.3:1을 2:1로 압축)과 스텁 단독 태그 회수 절벽(tag-exact 0.5×mult vs threshold 0.1 → mult 0.2 경계)을 재현:

```ts
// ─── archived 침강 스윕 (계수 발화 경로) ──────────────────────────────
// 수집형 vault 실측의 축소 재현: 같은 태그(cve-watch)에서 스텁 6 : 활성 3이 경쟁하고,
// L2 정제 1건이 스텁 위에 서야 한다. retro-incident 는 스텁만 가진 태그 —
// tag-exact(0.5)×계수가 threshold(0.1) 아래로 내려가는 0.2 경계에서 회수 절벽을 만든다.
...Array.from({ length: 6 }, (_, i) => ({
  path: `L4/advisories/cve-watch-archived-${String(i + 1).padStart(2, '0')}.md`,
  title: `CVE Watch Archived ${String(i + 1).padStart(2, '0')}`,
  layer: Layer.L4_ACTION,
  tags: ['cve-watch', 'advisory'],
  archived: true,
  updated: `2026-03-0${i + 1}`,
})),
...Array.from({ length: 3 }, (_, i) => ({
  path: `L4/advisories/cve-watch-active-${String(i + 1).padStart(2, '0')}.md`,
  title: `CVE Watch Active ${String(i + 1).padStart(2, '0')}`,
  layer: Layer.L4_ACTION,
  tags: ['cve-watch', 'advisory'],
  updated: `2026-03-1${i + 1}`,
})),
{
  path: 'L2/insights/cve-triage-playbook.md',
  title: 'CVE Triage Playbook',
  layer: Layer.L2_DERIVED,
  tags: ['cve-watch'],
  links: ['L4/advisories/cve-watch-active-01.md'],
  updated: '2026-03-20',
},
...Array.from({ length: 2 }, (_, i) => ({
  path: `L4/advisories/retro-incident-${String(i + 1).padStart(2, '0')}.md`,
  title: `Retro Incident ${String(i + 1).padStart(2, '0')}`,
  layer: Layer.L4_ACTION,
  tags: ['retro-incident'],
  archived: true,
  updated: `2026-03-0${i + 1}`,
})),
```

**goldenSet.ts**: 말미에 3건 추가. id prefix가 스윕 러너의 클래스 판정 규약임을 헤더에 1줄 명시 (`archived-working-*` = 활성이 정답·스텁은 노이즈, `archived-archival-*` = 스텁이 정답):

```ts
{
  id: 'archived-working-cve-watch',
  seeds: ['cve-watch'],
  relevance: {
    'L2/insights/cve-triage-playbook.md': 2,
    'L4/advisories/cve-watch-active-01.md': 2,
    'L4/advisories/cve-watch-active-02.md': 1,
    'L4/advisories/cve-watch-active-03.md': 1,
  },
},
{
  id: 'archived-working-advisory',
  seeds: ['advisory'],
  relevance: {
    'L4/advisories/cve-watch-active-01.md': 2,
    'L4/advisories/cve-watch-active-02.md': 2,
    'L4/advisories/cve-watch-active-03.md': 2,
  },
},
{
  id: 'archived-archival-retro',
  seeds: ['retro-incident'],
  relevance: {
    'L4/advisories/retro-incident-01.md': 2,
    'L4/advisories/retro-incident-02.md': 2,
  },
},
```

**검증**: `MAENCOF_EVAL_UPDATE_BASELINE=1 yarn eval` → `yarn eval` 통과, baseline queries 32. 기존 쿼리 지표 변동은 diff로 확인·Ledger 기록. **커밋**: `test(maencof): add archived-stub competition fixtures and golden queries`

## T2 — archivedSweep.eval.test.ts (픽스처 스윕)

decaySweep 미러. vi.mock getter로 상수를 갈아끼운다(운영 타입 불변):

```ts
let activeMultiplier: number | null = null;
vi.mock('../../constants/queryEngine.js', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../constants/queryEngine.js')
  >();
  return {
    ...actual,
    get ARCHIVED_SEED_MULTIPLIER(): number {
      return activeMultiplier ?? actual.ARCHIVED_SEED_MULTIPLIER;
    },
  };
});
```

- `const GRID = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.7, 1.0]` — 현행 0.3 포함(기본값 순위 비교 성립 조건).
- 클래스 분리: `GOLDEN_QUERIES`를 id prefix로 3분 — `archived-working-*` / `archived-archival-*` / 나머지 legacy. 지역 헬퍼 `measureQueries(searchFn: SearchFn, queries: GoldenQuery[]): EngineMetrics`가 `measureRankings` 재사용(`measureSearchFn`은 전체 고정이라 부적합).
- 측정 루프: 계수마다 `activeMultiplier = m; invalidateQueryCache();` → working/archival/legacy 3지표 → finally 원복+무효화 (decaySweep의 `measureCandidate` 패턴).
- 무결성 단언 3종: ① working 축 ndcg 값 종류 > 1(스파이 생존), ② archival 축 ndcg 값 종류 > 1, ③ legacy는 전 계수에서 동일(픽스처 격리 증명 — 움직이면 archived 태그가 기존 케이스로 샜다).
- 리포트: 콘솔 표(`[eval:archived] m=0.30 working ndcg 0.xxxx recall 0.xxxx | archival ndcg ... | legacy ndcg ...`) + 현행 0.3의 균등합(`working.ndcg10 + archival.ndcg10`) 순위 + `suggest_links` 경계 참고 라인(`tag-exact 0.5×m` < `min_score 0.2` 여부) + `MAENCOF_EVAL_ARCHIVED_SWEEP_REPORT=<path>` 시 JSON 기록. 균등합은 임의 가중임을 주석 명시 — 결정은 곡선으로.

**fail-first 검증**: vi.mock 팩토리의 getter를 일시적으로 `actual` 고정으로 바꿔 실행 → 무결성 단언 ①②가 red(축 평탄)임을 확인 후 원복 → green. **검증**: `yarn maencof test:run archivedSweep` 통과 + 표 출력. **커밋**: `test(maencof): add archived multiplier sweep runner (fixture mode)`

## T3 — 실볼트 graded 모드

- `buildLiveGraph`를 `src/__tests__/eval/buildLiveGraph.ts`로 추출(본문 그대로, JSDoc 유지), `liveVault.eval.test.ts`는 import 교체. 기존 describe/단언 불변.
- `archivedSweep.eval.test.ts`에 두 번째 describe: `describe.skipIf(!process.env.MAENCOF_EVAL_VAULT || !process.env.MAENCOF_EVAL_ARCHIVED_GOLDEN)('archived multiplier sweep (live vault, graded)')` — `buildLiveGraph(VAULT)`로 그래프를 만들고 같은 스윕 함수를 graded JSON 쿼리로 실행. timeout 300_000(liveVault 선례).
- 골든 JSON 계약(러너 내 타입 + 트러스트 바운더리 최소 검증 — 필드 존재·cls 열거·relevance 등급 1|2 확인, 위반 시 어떤 쿼리가 왜 무효인지 메시지):

```ts
interface LiveBenchQuery {
  id: string;
  cls: 'working' | 'archival';
  seeds: string[];
  /** vault-root 상대 경로 → 등급. liveSearchFn 이 node.path 를 반환하므로 좌표계 동일 */
  relevance: Record<string, 1 | 2>;
}
interface LiveBenchGolden {
  queries: LiveBenchQuery[];
}
```

- 실볼트 무결성 단언은 픽스처보다 완화: working·archival 각 축 값 종류 > 1 단언은 유지하되 legacy 클래스는 없음(golden 전체가 두 클래스). relevance 경로 중 그래프에 없는 경로는 경고 출력(오타 검출).

**검증**: env 미설정 `yarn eval`에서 skip 1 · 통과(기존 스위트 무영향) + 스크래치 더미 골든으로 1회 실행 성공. **커밋**: `test(maencof): add live-vault graded mode to archived sweep`

## T4 — 실볼트 골든셋 큐레이션 2벌 (리포 밖)

각 vault의 `.maencof-meta/eval/archived-golden.json` 작성. 절차(볼트당):

1. 경쟁 태그에서 working 시드 선정 — tirnanog: `security`·`cve`·`mcp`·`geeknews` 계열에서 4~6개(태그+제목 토큰 혼합), falias: `portfolio`·`discovery-watch`·`gold` 계열에서 4~5개.
2. working 정답 판정: 해당 태그의 **활성** 문서를 frontmatter 열람으로 골라 grade 부여(L2 정제·updated 최근·제목 대표성 우선, 쿼리당 relevance 3~6건). 스텁은 미기재(0).
3. archival 쿼리 3~4개: 스텁 고유 태그(falias `superseded` 등)·스텁 제목 토큰을 시드로, 해당 스텁 grade 2.
4. 스키마 자가 검증 후 저장.

**검증**: T5의 실볼트 스윕이 두 골든셋으로 완주. 커밋 없음(개인 데이터 비커밋 — Ledger에 파일 경로와 쿼리 수만 기록).

## T5 — 3면 스윕 실측 + 보고

```sh
# 픽스처 (리포트 JSON 은 scratchpad)
yarn maencof test:run archivedSweep
# falias / tirnanog
MAENCOF_EVAL_VAULT=$HOME/Soulstream/falias \
MAENCOF_EVAL_ARCHIVED_GOLDEN=$HOME/Soulstream/falias/.maencof-meta/eval/archived-golden.json \
MAENCOF_EVAL_ARCHIVED_SWEEP_REPORT=<scratchpad>/falias-sweep.json \
yarn maencof test:run archivedSweep
```

마무리 검증 체인: `yarn maencof typecheck` + `yarn eval` 전체 + `vitest run src/__tests__/unit/archivedDemotion.test.ts`. 산출: 3면 결과 표(계수 × working/archival 지표)와 0.3의 위치, 권고안을 최종 보고 — 계수 변경은 별도 결정.

## 자가 리뷰

- 요구 ↔ 태스크: 골든셋(실볼트 참조) = T4(+픽스처 반영 T1), 벤치마크 구조 = T2·T3, 튜닝 실측 = T5. ✓
- 이 플랜의 현재 상태 주장(경로·심볼·시그니처·실볼트 분포)은 전부 이 세션의 도구 출력으로 확인됨 — `measureRankings`·`LIVE_DEFAULTS`·`FixtureDoc`·`toKnowledgeNode`·`buildLiveGraph`·`buildKnowledgeNode:61`·`kgSuggestLinks:43`·`queryEngine.ts:53`·태그 집계. ✓
- 이름·시그니처 태스크 간 일치: `measureQueries`(T2 선언, T3 재사용), `buildLiveGraph`(T3 추출, T5 사용), env 3종. ✓
- 플레이스홀더 없음(모든 코드 스텝에 실코드). ✓

## Review verdict

- **cleared** (2026-08-20, ground 심층). Challenge 트리거 부재 — 테스트 인프라 한정, 파괴·마이그레이션 단계 없음, 이 세션이 실측 위에 직접 작성. 현재 상태 주장 전수(경로·심볼·시그니처·실볼트 분포·스크립트)가 이 세션 도구 출력으로 확인됨. 발견 1건: 실행 명령이 관례(`yarn maencof test:run <filter>`)와 달랐음 → 플랜 내 교정 완료.

## Ledger

- **T0** — 플랜 커밋 `054b50b2`. review verdict `cleared`(ground 심층), 명령 관례 교정 1건.
- **T1** — 픽스처 12건(cve-watch 스텁6/활성3 + L2 정제1 + retro-incident 스텁2) + 골든 3건 + baseline 재기록(29→32, ndcg 0.977→0.9748·recall 0.9711·precisionR 0.8487). **편차**: 플랜의 `cve-watch-archived-*` 명명이 compound 골든의 'archiv' df=1 전제를 깨 `compoundScoreSweep` 축 평탄 단언이 실패(InvertedIndex 가 title/tag 무구분) → `cve-watch-stub-*` 로 개명하고 격리 주석에 'archiv' 토큰 금지 명문화. 검증: 재기록 후 일반 모드 `yarn eval` 6 passed/1 skipped. 커밋 `48565b8a`.
- **T2** — `archivedSweep.eval.test.ts` 신설(getter 모듈 스파이 + 그리드 11점 + 클래스 3분 측정 + 축 무결성 2종 + legacy 격리 단언 + 균등합 순위/PROMOTION 보고 + env JSON 리포트). fail-first: getter 무력화 프로브로 축 평탄 red 확인 후 원복 green. 픽스처 곡선: working 0.9656(m≤0.7 평탄, 1.0에서 0.9291로 하락), archival 0(m=0)→1.0(m≥0.05) 계단, legacy 0.9746 전 구간 평탄(격리 증명), 균등합 rank 6/11(0.05~0.7 동률 — 픽스처는 계단 해상도, 연속 판별은 실볼트 몫). **편차 2건**: ① 플랜의 "threshold(0.1) 절벽" 가설은 오류 — `QueryOptions.threshold` 는 v1 은퇴로 무시되는 호환용 파라미터(`types.ts:56`, 캐시 키에만 존재)라 절벽이 없다. 주석 3곳(fixtureVault·goldenSet·러너 헤더)을 실측 서사로 교정. ② vitest 러너가 스윕 console 출력을 표시하지 않아(기존 decay/compound 스윕도 동일) 곡선 열람은 `MAENCOF_EVAL_ARCHIVED_SWEEP_REPORT` JSON 경로가 실질 관례. 검증: typecheck + `yarn eval` 7 passed/1 skipped. 커밋 `127ccc4f`.
- **T3** — `buildLiveGraph` 추출(신설 파일, liveVault 는 import 소비자로 축소) + 실볼트 graded describe(env 2종 skipIf, 골든 JSON 신뢰 경계 수동 검증, missing relevance 경로 경고+리포트 필드, 골든 파싱을 그래프 빌드 앞으로 — 형식 오류 즉시 실패). 검증: typecheck OK · `yarn eval` 7 passed/1 skipped·테스트 14 passed/2 skipped(env 부재 skip 정상) · cls 오타 프로브가 `invalid archived golden: query[0] (probe): cls must be 'working' | 'archival'` 로 실패 확인. 커밋 `7aa1d1ad`.
- **T4** — 실볼트 골든 2벌 큐레이션(리포 밖, 각 7쿼리 = working 4 + archival 3): `~/Soulstream/falias/.maencof-meta/eval/archived-golden.json`(시드 portfolio·asset-allocation·dca·gold / discovery-watch·undervalued-candidates·anchor-bias-warning), `~/Soulstream/tirnanog/.maencof-meta/eval/archived-golden.json`(security·mcp·langflow·geeknews / notable·cwe-502·제목 토큰). 판정 기준: L2 정제·현행 운영 문서 grade 2 우선, tag-prefix 채널 후보는 grade 1로 보수화, relevance 태그 보유를 grep 실측으로 전수 확인. 순도 예외 1건(cwe-502 — 활성 7건 미채점, 스텁이 최신 수집분이라 archival 의도 유지)은 골든 note 에 명시. 커밋 없음(개인 데이터 비커밋).
- **T5** — 3면 스윕 실측 완료(missing relevance 0/0). 곡선: **falias** rank 1/11 — working 0.4281 로 0.30 까지 평탄, 0.40 부터 침식(→1.00 에서 0.2957), archival 은 0.30 에서 0.6934 로 국소 최적(0.05~0.25 는 0.61 대) → **0.3 이 정확히 knee**. **tirnanog** rank 6/11 — 0.05~0.50 완전 동률(W 0.4171 / A 0.2311), 0.70 부터 working 침식 → 0.3 유지에 반대 증거 없음. **픽스처** rank 6/11 — 0.05~0.7 동률 대역. 종합: **현행 0.3 유지 지지** (falias 최적점 일치, 타 2면 최적 대역 내부). 리포트 JSON: scratchpad `falias-sweep.json`·`tirnanog-sweep.json`·`sweep-fixture.json`. 마감 검증: `yarn eval` 7 passed/1 skipped(T3 후 리포 코드 불변) + archivedDemotion 2 passed.
