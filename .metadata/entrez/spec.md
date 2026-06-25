# entrez — Spec (책임 · 데이터 흐름 · 비채택)

> `entrez` = Claude 를 **NCBI E-utilities 논문 검색기**로 만드는 plugin. 단일 도메인은 NCBI 통합 검색(pubmed·pmc·mesh). 핵심 목표는 **검색 누락 방지(recall)**. 원칙: agent=추론(WHAT) · skill=절차(HOW) · MCP=계약(I/O) · 코드 규칙(10k cap·POST·rate·lint)=deterministic service.

## 컴포넌트 책임

| 컴포넌트 | 위치 | 책임 |
|----------|------|------|
| **search 스킬** (Dispatcher) | `skills/search/` | intent 분류 → 상태머신 전이 → paper-search-expert 오케스트레이션 → 모드별 checkpoint. ①②③ 파이프라인 겸 진입점 |
| **query 스킬** | `skills/query/` | 자연어 → PubMed 검색식만 생성(검색 X). ① 단계만 |
| **download 스킬** | `skills/download/` | PMID/PMCID → OA PDF 저장 + 비OA 링크 리포트. search 후속 |
| **setup 스킬** | `skills/setup/` | web UI 설정 (api_key·tool·email) — 상세 [setup.md](./setup.md) |
| **paper-search-expert 에이전트** | `agents/paper-search-expert.md` | **생성 모드**(WHAT·recall): 주제 분해→`mesh_lookup`→`QueryRole` 다중 검색식 / **재랭킹 모드**(RANK·precision): pre-score 후보→top-N 의미 점수. prompt·schema·reference 분리(물리 1 agent) — [agents.md](./agents.md) |
| **paper_search** (MCP) | `src/mcp/tools/paperSearch/` | ESearch(count probe)→segment→union→dedup. 대량 async job |
| **mesh_lookup** (MCP) | `src/mcp/tools/meshLookup/` | MeSH Descriptor/SCR/entry 매핑 (`db=mesh`) |
| **fetch_fulltext** (MCP) | `src/mcp/tools/fetchFulltext/` | idconv→oa.fcgi→PMC OA 다운로드 (per-format 실패 표현) |
| **setup / auth-check** (MCP) | `src/mcp/tools/{setup,authCheck}/` | 설정 저장 / EInfo 도달성·rate 표시 |
| **httpClient** (core) | `src/core/httpClient/` | 모든 외부 HTTP 단일 통로: fetch·retry·429 backoff·**auto-POST**·**SSRF** eutils allowlist·tool+email 주입 (atlassian 차용) |
| **segmenter** (core) | `src/core/segmenter/` | `Count>10000` 시 날짜(dp/edat/crdt) 버킷 분할(재귀) → 전수 확보 |
| **union** (core) | `src/core/union/` | dedup **복합키 PMID>DOI>title**·`hit_by`·`query_role` 병합·저자 구조화(LastName/ForeName/Initials/Collective/ORCID 분리) |
| **espell** (core) | `src/core/espell/` | ESpell 철자 교정(union 0/저조·OOV·spelling-warning 시 재시도) |
| **queryLint** (core) | `src/core/queryLint/` | 검색식 사전 검증: 괄호 짝·예약어·태그 오용·ATM/explosion 무력화 패턴 |
| **searchJob** (core) | `src/core/searchJob/` | 대량 검색 async job 레지스트리·진행률·cursor (start/status/results) |
| **sourceResolver / config** (core) | `src/core/{sourceResolver,config}/` | `db` 해석(pubmed/pmc/mesh)·config·credentials 로드 |

**의존성 단방향**: Dispatcher(search) → Agent(paper-search-expert) → Skill → MCP → core/httpClient → eutils. 역방향 호출 금지. 비결정 LLM(생성·재랭킹)을 결정적 Dispatcher + 결정적 MCP(union·segment·dedup)가 감싼다.

intent 분류는 `IntentType`(`FULL_SEARCH`·`QUERY_ONLY`·`DOWNLOAD`·`NEEDS_CLARIFICATION`), 실행 모드는 `ExecutionMode`(`interactive`(기본)·`auto`) — 둘 다 Dispatcher 소유. 상태(`INTAKE`·`CLASSIFY`·`QUERY_GEN`·`SEARCH`·`RANK`·`COMPLETE` + `FAILED`·`BLOCKED_NEEDS_USER`)·전이표·guard 상세는 [dispatcher.md](./dispatcher.md).

## 데이터 흐름 — full-search (`interactive` 기본)

RAG ①②③: ①LLM 검색식 다양화(`QueryRole`·ESpell) → ②MCP 결정론 union(segment·POST·dedup) → ③LLM 재랭킹(pre-score 후 top-N).

```
1. 사용자: "X 주제 논문 찾아줘" (자연어 주제)
2. search(Dispatcher): intent=FULL_SEARCH → 상태머신 진입 (INTAKE→CLASSIFY)
3. → QUERY_GEN: paper-search-expert(생성 모드)
      ├ 주제 분해 → mesh_lookup(MCP): Descriptor/SCR/entry 매핑
      └ QueryRole 다중 검색식 생성 (ATM_BROAD·MESH_EXPLODED·MESH_NOEXP·TIAB_SYNONYM·ALL_FIELDS·SIMILAR)
      *(interactive: 검색식 제시 → USER_REFINE 검토 루프 → SEARCH)*
4. → SEARCH: paper_search(MCP) 내부 단계(코드, 상태 비노출):
      query_lint → count_probe → (10k 초과)date_segment → fetch_ids → fetch_records(POST·batch) → union·dedup → partial_recovery
      *(대량: paper_search_start → async job → 진행률 피드백 → paper_search_results)*
      ├ recall 게이트: union 빈약 → QUERY_GEN 복귀(broad화)
      └ guard: recallIter≤4 + operationBudget(maxRequests·maxRecords·maxWallMs) + rateRetry≤5
5. → RANK: paper-search-expert(재랭킹 모드)
      ├ deterministic pre-score 로 후보 축소
      └ top-N 만 LLM 의미 점수·근거 (정렬만; 제거 X)
6. → COMPLETE: 레코드(메타+초록) 반환 + SearchManifest 기록
      *(interactive: 여기서 사용자와 대화로 품질 향상 — 추가 검색식·필터)*
```

누락 방지 3중: ① ATM+MeSH explosion+tiab+similar 스펙트럼 · ② union+`hit_by`+`query_role`+전수(10k 초과 segment) · ③ 정렬만(후보 제거 X).

## 데이터 흐름 — `--auto` (pipeline)

3~5단계의 recall 루프를 **무인 + 수렴**. `QUERY_GEN↔SEARCH` 를 `operationBudget`(maxRequests·maxRecords·maxWallMs) + `recallIter≤4` + `rateRetry≤5` 한계까지 자동 반복(USER_REFINE checkpoint 없이). 수렴 조건: union 증가율<5% or cap 초과 or budget 소진. 결과는 파일 출력 + `date_tag`. 한계 초과 시 `FAILED` 상태로 종료하며 사유·부분 결과(`partial`) 보고. 상태머신·전이표·guard 상세는 [dispatcher.md](./dispatcher.md).

## 데이터 흐름 — query-only

```
1. 사용자: "이 주제 PubMed 검색식 만들어줘" (검색 실행 의사 없음)
2. search/query: intent=QUERY_ONLY → CLASSIFY 종결 분기
3. → QUERY_GEN: paper-search-expert(생성 모드) + mesh_lookup → QueryRole 검색식 집합
4. → query_lint 통과 검색식 반환 (① 만; SEARCH·RANK 미진입)
```

검색식 본문 + `QueryRole`·근거(rationale)·QueryTranslation 예상치를 제시. 사용자가 PubMed 웹/타 도구에 직접 사용하거나, 이어서 full-search 로 승격 가능.

## 데이터 흐름 — download

```
1. 사용자: PMID/PMCID 목록 또는 직전 search 결과의 레코드
2. download 스킬: intent=DOWNLOAD
3. → fetch_fulltext(MCP): idconv(PMID→PMCID) → oa.fcgi(OA·license 판별)
      ├ OA: PDF/XML/TAR 저장 (license·sha256 기록)
      └ 비OA: DOI·LinkOut 링크만 리포트 (저장 X)
4. → downloaded[](license·oaStatus·sha256) + unavailable[](reason·links). per-format 실패 개별 표현.
```

원칙: "OA 면 저장, 비OA 면 링크 리포트". license·copyright 표시 필수(PMCID 존재 ≠ 재배포 가능). `mesh` 는 노출 스킬 없이 MCP 로만, export 는 search 출력이 흡수.

## 아티팩트 계약 — SearchManifest

모든 검색은 **SearchManifest**(JSON) 를 기록한다 → 재현·디버깅·논문 방법론 인용. `paper_search` 출력의 `reproducibility.manifestPath` 가 이를 가리킨다. WebEnv 가 ~1시간 만료되므로 **fetched PMID checksum(snapshot)** 이 재현성의 1차 근거다. TS 정본은 `src/types/manifest.ts`, 도구 계약은 [mcp-tools.md](./mcp-tools.md).

```ts
interface SearchManifest {
  pluginVersion: string;                  // plugin version
  baseUrl: string;                        // eutils base URL
  db: Db;                                 // pubmed | pmc | mesh
  queries: ManifestQuery[];               // raw queries + QueryRole + QueryTranslation
  counts: { perQuery: Record<string, number>; unionUnique: number }; // counts
  timestamp: string;                      // ISO8601
  paging: { retmax: number; retstart: number; batchSize: number };
  apiKeyUsed: boolean;                    // 사용여부만 (값 제외)
  history?: { webEnv: string; queryKey: string }; // WebEnv/query_key (보조)
  fetchedPmidChecksum: string;            // 재현용 PMID snapshot 체크섬 (1차 근거)
  caps: CapEvent[];                       // 10k 초과·segment 발생 내역
  warnings: string[];                     // espell·lint·partial 경고
}

interface ManifestQuery {
  role: QueryRole;
  term: string;                           // 검색식 본문 (데이터)
  translation?: string;                   // PubMed QueryTranslation (ATM 변환 결과)
  count: number;
  capped: boolean;
}

interface CapEvent {
  query_role: QueryRole;
  count: number;                          // 원 Count
  strategy: CapStrategy;                  // WARN | DATE_SEGMENT | ABORT
  segments: number;                       // 분할 버킷 수
  dateField: DateField;                   // 분할 기준 (dp | edat | crdt)
}
```

**dedup·정규화**(`core/union` 소유): 복합키 `PMID`(primary) → `DOI` → 정규화 title. PubMed 내부는 PMID, 형제 plugin 병합 시 DOI secondary. 저자는 LastName·ForeName·Initials·CollectiveName·ORCID 분리(문자열 합치기 금지). **캐싱**: mesh=versioned(연간 갱신)·ESearch count=short TTL·PMID metadata=긴 TTL(ahead-of-print 갱신 표기) — 상세 [mcp-tools.md](./mcp-tools.md).

## 비채택 (Explicit Non-Adoption)

| 결정 | 비채택 | 이유 |
|------|--------|------|
| 실행 자리 | **node `.mjs` 직접 실행** (sandboxed runner) | external-fetch-policy 가 MCP tools 를 허용 → runner 회색지대 소멸. 모든 HTTP 는 MCP `core/httpClient` |
| 범위 | **멀티소스 한 plugin** (Europe PMC·Crossref·Scholar 통합) | 이종 API 호출법 상이 → "한 API=한 plugin". 비NCBI 는 형제 plugin |
| 인증 | **무거운 auth** (basic/bearer/OAuth) | E-utilities 는 선택적 api_key 만 → web UI setup + `credentials.json`(0o600) 로 충분 |
| 응답 방식 | **동기 단일 응답** | 수천~만 건 = MCP 동기 타임아웃 → async job(`start`/`status`/`results`) + cursor |
| 재랭킹 | **전건 LLM 재랭킹** | 비용·일관성 위배 → deterministic pre-score 후 **top-N 만** LLM(정렬만, 제거 X) |
| union | **LLM union/dedup** | 누락 0 = 결정론 필수 → MCP 복합키 dedup(PMID>DOI>title) |
| 에이전트 | **생성/재랭킹 2개 agent 분리** | self-bias↓·일관성 → 물리 1 agent + 모드(prompt·schema·평가기준) 분리 |
| 스킬 분할 | **mesh 별도 노출 스킬** | mesh 는 MCP 로만, export 는 search 출력 흡수 → 노출 **4** (search·query·download·setup) |
| 게이트 | **r-statistics식 다층 hard/soft 게이트** | 검색의 목표는 "누락 방지"(품질 차단 아님) → 게이트 대신 recall 루프 + `operationBudget` |
| Dispatcher | **별도 TS 데몬 프로세스** | Claude Code 코드 자리는 MCP 뿐 → 경량 search 스킬 상태머신 + SEARCH 내부 단계는 코드(MCP) |
| 자동화 | **hook** | 사용자 결정 (불필요) |
