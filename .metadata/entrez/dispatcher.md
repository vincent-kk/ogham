# entrez — Dispatcher (상태머신)

`search` 스킬이 구현. 상태/전이 규칙은 `skills/search/references/state-machine.md`, 검색식 다양화·재랭킹 추론은 [agents.md](./agents.md)의 `paper-search-expert`, 결정론적 강제(10k cap·POST 전환·rate backoff·dedup)는 `paper_search` MCP([mcp-tools.md](./mcp-tools.md)). 상태는 **경량**으로 유지하고 검색 도메인 규칙은 코드 단계(`SEARCH` 내부)로 흡수한다. 비결정 위험은 명시적 전이표 + iteration guard로 억제.

**불변 규칙**: 상태 전이는 Dispatcher만. agent는 추천만(검색식 생성·재랭킹). Dispatcher는 agent만 `Task`로 호출하고, MCP 직접 호출은 agent가 한다. 모든 전이·검색은 `SearchManifest`에 기록(재현성, [spec.md](./spec.md)).

## Intent 분류 (deterministic-first)

enum `IntentType`.

| intent | 신호 | 경로 |
|--------|------|------|
| `FULL_SEARCH` | 주제/질문 + "찾아줘·검색·논문·리뷰" + 결과(레코드) 기대 | 전체 파이프라인(①②③) |
| `QUERY_ONLY` | "검색식만", "PubMed 쿼리 만들어", 실행 요청 없음 | `query` 스킬 직행 → ① 만 |
| `DOWNLOAD` | PMID/PMCID/DOI 제시 + "PDF·전문·받아줘" | `download` 스킬 직행 → `fetch_fulltext` |
| `NEEDS_CLARIFICATION` | 주제 모호·범위 불명·db 미정 | 사용자에게 질문 |

## 상태 (6 + 종결 2)

`INTAKE · CLASSIFY · QUERY_GEN · SEARCH · RANK · COMPLETE` (+ `FAILED` · `BLOCKED_NEEDS_USER`).

- `QUERY_GEN`·`RANK`는 `paper-search-expert`의 두 내부 모드(생성 WHAT / 재랭킹 RANK)에 대응.
- `USER_REFINE`는 별도 상태가 아니라 **interactive 모드에서 `QUERY_GEN`→`SEARCH` 사이의 checkpoint 동작**으로 흡수(검색식 제시 → 사용자 수정 → 재생성). r-statistics의 `HUMAN_CONFIRM_*` 처리와 동형.
- `QUERY_ONLY`/`DOWNLOAD`는 `CLASSIFY`의 종결 분기(각 스킬 직행 → `COMPLETE`).

## SEARCH 내부 단계 (코드 단계 — 상태로 노출 안 함)

`SEARCH`는 단일 상태지만 내부는 `paper_search` MCP의 결정론 파이프라인. 경량 상태머신 유지를 위해 아래는 **상태가 아닌 코드 단계**로 캡슐화(전이표에 등장하지 않음, 자원 소비만 `operationBudget`에 합산):

| 단계 | 동작 | 근거 |
|------|------|------|
| `query_lint` | 괄호 짝·예약어·field tag 오용 검사. 따옴표/wildcard/태그가 ATM·explosion을 끄는지 사전 검증 | 검색식 다양화 무력화 방지 |
| `count_probe` | ESearch `retmax=0`으로 `Count`만 선조회 | 10k 초과·빈약 판정 |
| `date_segment` | `Count>10000`이면 `dp`/`edat`/`crdt` 버킷 분할(`CapStrategy=DATE_SEGMENT`) | 🔴 10,000 UID 상한 우회(전수 확보) |
| `fetch_ids` | ESearch UID 수집(또는 `usehistory` WebEnv+query_key) | — |
| `fetch_records` | EFetch/ESummary 레코드. id>~200·URL>2000자 → **POST**, `batchSize` 200~500, `retmax` 명시 | 🔴 GET 414 회피 |
| `partial_recovery` | `failed_batches`·`missing_pmids` 격리·재시도, 부분 결과 보존 | 부분실패 무손실 |

- 단계 실패는 상태 전이가 아니라 코드 레벨 재시도(`rateRetry`)로 처리. WebEnv는 ~1시간 만료 위험이 있어 페이징 지연 시 PMID snapshot으로 대체([spec.md](./spec.md)).

## 전이표

| From | Event / Guard | To | Action |
|------|--------------|----|--------|
| INTAKE | request | CLASSIFY | normalize, bind `{topic, db, dateRange, mode}` |
| CLASSIFY | `FULL_SEARCH` | QUERY_GEN | — |
| CLASSIFY | `QUERY_ONLY` | (`query` 스킬) → COMPLETE | 검색식만 반환(검색 X) |
| CLASSIFY | `DOWNLOAD` | (`download` 스킬·`fetch_fulltext`) → COMPLETE | search 후속 |
| CLASSIFY | `NEEDS_CLARIFICATION` | BLOCKED_NEEDS_USER | 주제·범위·db 질문 |
| QUERY_GEN | 검색식 생성(`QueryRole` 다중) | SEARCH | agent 생성 모드 *(interactive: 검색식 제시·USER_REFINE)* |
| QUERY_GEN | (interactive) 사용자 수정 | QUERY_GEN | USER_REFINE 반영·재생성 |
| SEARCH | union 충분(증가율<5% or 충분) | RANK | 내부 단계 완료·dedup union |
| SEARCH | union 빈약 | QUERY_GEN | `recallIter++` → broad화 (recall 게이트) |
| SEARCH | 대량(수천~만 건) | SEARCH | async job 생성 + 진행률 피드백 |
| SEARCH | 429 / 부분실패 | SEARCH | `rateRetry++` backoff · `partial_recovery` (상태 유지) |
| RANK | 재랭킹 완료 | COMPLETE | pre-score 후 top-N 레코드 *(interactive: 결과 대화)* |
| RANK | pre-score 후보 0 | QUERY_GEN | `recallIter++` (recall 게이트) |
| (any) | `recallIter>4` · operationBudget 초과 · `rateRetry>5` | FAILED | 사유 + SearchManifest 보고 |
| (any) | 진동·교착(동일 검색식 2회 0건) | BLOCKED_NEEDS_USER | 사용자 결정 요청 |

## recall 게이트 (누락 방지 핵심)

검색의 목표는 precision이 아니라 **recall**. `SEARCH`/`RANK` 종료 전 union 충분성을 게이트로 검사:

| 신호 | 동작 |
|------|------|
| union `total_unique` 임계 미만(빈약) | `QUERY_GEN` 재진입 → **broad화**(`ATM_BROAD`·`MESH_EXPLODED`·`ALL_FIELDS` 가중, `[mh:noexp]`·과한 `[tiab]` 한정 완화) |
| ESpell OOV·spelling-warning·union 0 | ESpell 교정 후 `QUERY_GEN` 재시도 |
| union 증가율 ≥5% | 아직 수렴 안 됨 — recall 루프 계속(guard 한계 내) |
| union 증가율 <5% (or cap 초과 or 사용자 중단) | 수렴 → `RANK` 진행 |
| `Count>10000` | 게이트 아님 — `SEARCH` 내부 `date_segment`로 전수 확보 |

recall 종료 = `recallIter≤4` **AND** (증가율<5% **OR** cap 초과 **OR** 사용자 중단) **AND** operationBudget 잔여.

## Iteration guard (budget 기반)

검색은 한 전이가 수천 레코드를 부를 수 있어 **전이 수(totalTransitions)는 무의미**. 자원 상한으로 대체:

- `recallIter ≤ 4` — `QUERY_GEN`↔`SEARCH` 재진입 한계.
- `rateRetry ≤ 5` — 429 backoff 재시도 한계.
- `operationBudget` — `{ maxRequests, maxRecords, maxWallMs }` 자원 상한(`SEARCH` 내부 단계 포함 합산).
- 셋 중 하나라도 초과 → `FAILED`(부분 결과 + SearchManifest 동봉).

## 발산 처리

| 신호 | 동작 |
|------|------|
| 동일 검색식 2회 0건 | 중단 → `BLOCKED_NEEDS_USER` (주제 재정의 요청) |
| `recallIter` 소진 + union 무증가 | 있는 union으로 `RANK` 또는 `FAILED`(빈약 명시) |
| agent가 동일 broad 검색식만 반복 생성 | 차단 → 다른 `QueryRole` 강제(진동 억제) |
| operationBudget 소진(maxRecords·maxWallMs) | `FAILED` → 부분 결과 + SearchManifest |
| 429 연속 `rateRetry` 초과 | `FAILED` (대량작업 권장 시간대 안내: 미 동부 21:00~05:00·주말) |
| `QUERY_ONLY`인데 union 요구 | 무시 — 검색 미수행(검색식만 반환) |

## 실행 모드 (`modes.md`)

enum `ExecutionMode`.

| | `interactive` (기본) | `--auto` |
|--|--------------------|---------|
| QUERY_GEN checkpoint | 검색식 제시·`USER_REFINE` 대화 | 자동 통과(무인 생성) |
| recall 게이트 | union 표시·broad화 동의 후 진행 | 무인 수렴(증가율<5%까지 자동 루프) |
| RANK 결과 | top-N 대화·근거 설명 우선 | 자동 산출 |
| 대량 작업 | 진행률 피드백 + 확인 | 무인 async + 진행률 로그 |
| 종료 | 레코드 반환·설명 우선 | 파일 출력(+`date_tag`) + SearchManifest |

## 대량 async job + 진행률

`SEARCH`가 대량(수천~만 건·10k segment)을 감지하면 동기 응답 대신 async job:

- `paper_search_start` → job_id 발급 → `paper_search_status` 폴링(MCP progress로 진행률 피드백) → `paper_search_results`.
- `ids_only` + `cursor`로 후보를 먼저 축소, **deterministic pre-score**로 top-N만 추려 `RANK`(LLM)에 전달(전건 LLM 재랭킹 금지).
- job 실패·timeout은 `partial_recovery`로 부분 결과 보존, budget 초과 시 `FAILED`.

## Hand-off (Dispatcher → agent)

Dispatcher가 `paper-search-expert`에 최소 context를 전달. agent는 모드별 구조화 델타만 반환(상태 전이는 하지 않음). 상세 [agents.md](./agents.md).

```ts
interface SearchHandoff {
  from: "dispatcher";
  to: "paper-search_expert";
  context: {
    topic: string;
    db: Db;                              // PUBMED | PMC | MESH
    dateRange?: { from?: string; to?: string; dateField?: DateField };
    mode: ExecutionMode;                 // interactive | auto
    stage: DispatcherState;              // 이 문서의 상태 — QUERY_GEN(생성 모드) | RANK(재랭킹 모드)
  };
}
```

- 생성 모드 응답: `{ queries[]{ term, role, breadth, rationale } }` (`role`=`QueryRole`, `breadth`=`Breadth`).
- 재랭킹 모드 응답: `{ ranked[]{ pmid, score, reason } }` (pre-score 후보에 한정).
- 모든 hand-off·전이·검색 결과는 `SearchManifest`(plugin version·base URL·db·raw queries·PubMed `QueryTranslation`·counts·retmax/retstart/batchSize·WebEnv/query_key·fetched PMID checksum·warnings/caps)에 append — 재현·디버깅·논문 방법론 인용용([spec.md](./spec.md)).
