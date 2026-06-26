# entrez — 통합 개발 계획 (PLAN.md)

> **목표**: `.metadata/entrez/` 설계 정본(9문서 + L4 v3 크로스체크)을 실제 Claude Code plugin으로 구현한다.
> **정체성**: Claude를 NCBI E-utilities(PubMed) "학술 논문 검색 전문가"로 만드는 plugin. 설계의 단 하나의 닻 = 검색 **누락 방지(recall)**.
> **진행 방식**: Phase 0 → 8 순차(테스트는 각 Phase 내에서 동반 작성). 각 Phase는 매핑된 `.metadata` 문서를 **반드시 참고**하고, **완료 기준(DoD)을 충족(테스트 그린)**한 뒤 다음으로 넘어간다. TDD 권장 — 핵심 순수 함수·계약은 테스트 먼저.

---

## 0. 설계 출처 (필수 참고)

구현 전, `.metadata/entrez/`의 9개 문서를 정본으로 삼는다. Phase별 매핑:

| Phase           | 참고 `.metadata` 문서                                                                         |
| --------------- | --------------------------------------------------------------------------------------------- |
| 0 스캐폴딩      | `architecture.md`(디렉토리 트리), `README.md`                                                 |
| 1 상수·타입     | `architecture.md`(규약·enum 22종), `mcp-tools.md`(I/O 타입), `spec.md`(SearchManifest)        |
| 2 core 네트워크 | `architecture.md`(httpClient 차용), `mcp-tools.md`(제약·보안)                                 |
| 3 core 검색엔진 | `mcp-tools.md`(segment·union·partial), `dispatcher.md`(guard·budget), `roadmap.md`(core 모듈) |
| 4 adapters      | `mcp-tools.md`(E-utilities 흐름), `roadmap.md`(adapters 7)                                    |
| 5 MCP 도구      | `mcp-tools.md`(5종 계약·annotations), `spec.md`(데이터 흐름)                                  |
| 6 setup web UI  | `setup.md`(atlassian 차용·config/credentials)                                                 |
| 7 스킬·에이전트 | `skills.md`, `agents.md`, `dispatcher.md`(상태머신), `spec.md`                                |
| 8 e2e·빌드      | `roadmap.md`, `spec.md`(비채택 대조)                                                          |

## 0.1 불변 규약 (모든 Phase 공통)

- **FCA**: 프랙탈 분리 + 부속품 격리(`lib/`,`utils/`) + 상향식 지연 로딩. 각 프랙탈에 `index.ts` 배럴 + `INTENT.md`(Purpose/Structure/Conventions/Boundaries/Dependencies, 한국어).
- **1함수 1파일**: `operations/*.ts` 단일 export. `adapters/eutils/*.ts`는 E-utility 함수당 1파일.
- **문자열 리터럴 상수화**: 전량 `src/types/enums.ts`(`as const`) 또는 `src/constants/{messages,defaults,paths}.ts`. **인라인 리터럴 금지** (ESLint 룰로 강제 — Phase 0에서 설정).
- **의존성 단방향**: Dispatcher → Agent → Skill → MCP → httpClient → NCBI. 역방향 import 금지(ESLint `import/no-restricted-paths`).
- **hook 미사용.** subprocess는 `@ogham/cross-platform` 경유(`child_process` 직접 금지), 취소는 `AbortSignal`.
- **SSoT**: 검색식 방법론=`skills/_shared/query-strategy.md`, 재랭킹=`skills/_shared/rerank.md`, 절차=`search` SKILL.md, 계약=MCP+`_shared/mcp-tools.md`, E-utilities 사실=`_shared/eutils.md`. 중복 금지. (에이전트 참조 문서는 `agents/` 하위 디렉토리 불가 — 플러그인 로더가 `agents/*.md`를 전부 에이전트로 취급 — 이므로 `skills/_shared/`에 둔다.)
- **형식 레퍼런스**: `plugins/deilen`(MCP·빌드 esbuild), `plugins/r-statistics`(3-Layer·Dispatcher·테스트), `plugins/atlassian`(httpClient·setup web UI·configManager/authManager). 모호하면 이 실제 파일을 참고.

## 0.2 테스트 전략 (전체 — 완성도의 핵심)

> 사용자 요구: **유닛 + e2e 모두**, 완성도 높은 결과물. 테스트는 후순위가 아니라 각 Phase의 DoD다.

| 계층                | 도구·위치                                             | 대상                                                                                                                        | 네트워크      |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **유닛**            | vitest, `src/**/__tests__/`                           | 순수 함수(union·segmenter·queryLint·dedup·normalizeTitle), httpClient(모킹 fetch), adapters(fixture 파싱), config(zod·권한) | 모킹          |
| **통합**            | vitest, `src/mcp/**/__tests__/`                       | MCP 도구 핸들러 — 모킹 httpClient로 NCBI 응답 주입, 계약(I/O 스키마)·부분실패·async 검증                                    | 모킹          |
| **e2e(fixture)**    | vitest `test/e2e/`, `@e2e` 태그                       | 전체 파이프라인을 **녹화된 NCBI 응답 fixture**로 결정론 재현                                                                | 없음(fixture) |
| **e2e(live smoke)** | vitest `test/live/`, `@live` 태그(기본 skip, CI 옵션) | 실제 `eutils` 소량 호출 — 계약·스키마·필드 존재, rate limit 준수                                                            | 실호출        |

**원칙**

- **fixture 우선**: `test/fixtures/`에 NCBI 응답(ESearch/EFetch XML, ESummary, mesh, oa.fcgi, idconv) 1회 녹화 → 결정론 테스트. live는 계약 회귀 감시용 smoke로 분리(네트워크·rate 비결정성 격리).
- **calibration**(filid 패턴): 알려진 주제 → 기대 PMID 집합/최소 recall을 fixture로 고정해 회귀 감지(`test/calibration/`).
- **커버리지 목표**: `src/core`·`src/adapters` **90%+**, 전체 **85%+**. CI 게이트.
- **mock 경계**: NCBI HTTP는 항상 `core/httpClient` 한 곳에서만 모킹(상위는 httpClient를 주입받음 — DI). adapters/도구는 httpClient 더블로 테스트.
- **비결정 차단**: `Date.now`/random은 주입(seam)해 fixture 재현성 확보. `SearchManifest.timestamp`도 주입.

---

## Phase 0 — 스캐폴딩

**목적**: plugin 등록 + 빈 골격 + 빌드·테스트 파이프라인. `plugins/deilen`·`plugins/r-statistics` 구조를 복제해 entrez로 치환.

- [ ] `plugins/entrez/.claude-plugin/plugin.json` — name `entrez`, description(영문: NCBI E-utilities paper search…), `skills: "./skills/"`, `mcpServers: "./.mcp.json"`. **agents 필드 없음**(filid처럼 `agents/` 자동 발견).
- [ ] `package.json` — `@ogham/entrez`, `type: module`, `files: [bridge, skills, agents, .claude-plugin, .mcp.json, README.md]`, deps `@modelcontextprotocol/sdk`·`zod`·`@ogham/cross-platform`, scripts `build`(clean→tsc→buildMcpServer)·`dev`·`test`·`test:e2e`·`test:live`·`typecheck`·`lint`.
- [ ] `tsconfig.json`(extends `../../tsconfig.base.json`) + `tsconfig.build.json`.
- [ ] `.mcp.json` — `{ "mcpServers": { "tools": { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"] } } }`.
- [ ] `scripts/buildMcpServer.mjs` — esbuild 번들(deilen 패턴) → `bridge/mcp-server.cjs`.
- [ ] `vitest.config.ts`(태그별 프로젝트: unit/e2e/live, 커버리지 임계) + `vitest.setup.ts`.
- [ ] `eslint.config` 확장 — 인라인 문자열 리터럴 금지 룰 + `import/no-restricted-paths`(단방향 의존).
- [ ] `README.md`·`README-ko_kr.md`·`INTENT.md`·`CLAUDE.md`(plugin 루트).
- **테스트**: 빈 MCP 서버 기동 smoke(서버 createServer→도구 0개 등록 OK), `yarn typecheck`·`yarn lint` 그린.
- **DoD**: `yarn build` → `bridge/mcp-server.cjs` 생성, 플러그인 매니페스트 인식, 빈 vitest 통과.

## Phase 1 — 상수 · 타입 (토대)

**목적**: 모든 문자열 상수·스키마를 한곳에. 이후 전 Phase가 의존.

- [ ] `src/types/enums.ts` — `as const` **22종 전량**: `Db`·`SortOrder`·`DateType`·`DateField`·`RecordField`·`QueryRole`(6값)·`Breadth`·`MeshMatch`·`FulltextFormat`·`UnavailableReason`·`RateLimit`·`EutilFn`·`RetMode`·`HttpMethod`·`FieldTag`·`FetchMode`·`CapStrategy`·`JobStatus`·`ExpansionSource`·`IntentType`·`ExecutionMode`·`ErrorCode`.
- [ ] `src/types/config.ts` — zod: `tool`·`email`(필수)·`api_key`(선택)·`db`·`base_url`·`output_path`·`date_tag`·`rate_limit`·날짜범위.
- [ ] `src/types/record.ts` — `PaperRecord`(pmid primary·doi·pmcid·title·abstract·**authors[]{lastName,foreName,initials,orcid?,collective?}**·journal·year·mesh[]·hit_by[]·query_role[]).
- [ ] `src/types/manifest.ts` — `SearchManifest`(version·baseUrl·db·rawQueries·queryTranslations·counts·timestamp·retmax/retstart/batchSize·apiKeyUsed(bool)·webEnv/queryKey·fetchedPmidChecksum·warnings/caps).
- [ ] `src/constants/{paths,defaults,messages}.ts` — `DEFAULT_RETMAX`·`BATCH_SIZE`(200~500)·`UID_HARD_CAP`(10000)·`operationBudget` 기본·`recallIter`(4)·`rateRetry`(5)·base URL·메시지.
- **참고**: `architecture.md`(enum 카탈로그·규약), `mcp-tools.md`(타입), `spec.md`(SearchManifest).
- **테스트(유닛)**: zod config 검증(필수 누락·타입), `PaperRecord`/`SearchManifest` 스키마 round-trip, enum 멤버 완전성(22종 존재).
- **DoD**: 인라인 문자열 리터럴 0건(lint), 타입 정본 컴파일.

## Phase 2 — core 네트워크 (httpClient · sourceResolver · config)

**목적**: 안전한 NCBI 네트워크 계층. atlassian httpClient 차용.

- [ ] `src/core/httpClient/` — `operations/{request,withRetry,backoff429,autoPost,ssrfGuard}.ts` + `index.ts` + `INTENT.md`.
      (fetch 래퍼·timeout·encoding / 5xx·네트워크 지수 backoff / 429 backoff+`rateRetry≤5` / **auto-POST**(id>~200 or URL>2000자→`application/x-www-form-urlencoded`) / **SSRF allowlist**(eutils+idconv+oa.fcgi 호스트, 사설망·리다이렉트 차단) / `tool`·`email`·`api_key` 자동 주입·`retmax` 강제)
- [ ] `src/core/sourceResolver/` — `operations/{resolveDb,buildBaseUrl}.ts` (db→base URL).
- [ ] `src/core/config/` — `operations/{loadConfig,loadCredentials,resolveRateLimit}.ts` (config.json/credentials.json 0o600, key 유무→3/10 sec).
- [ ] `src/lib/`·`src/utils/` 시작 — `atomicWrite`·`logger`·`xmlParse`·`sha256`·`isoNow`(주입형).
- **참고**: `architecture.md`(httpClient 차용 절), `mcp-tools.md`(보안·제약). atlassian `src/core/httpClient`·`ssrfGuard` 실제 파일.
- **테스트(유닛)**: 429→backoff→재시도→`rateRetry` 초과 시 중단 / auto-POST 전환 임계(199 GET vs 201 POST, URL 길이) / SSRF 차단(사설 IP·다른 호스트·리다이렉트) / `tool`·`email`·`api_key`·`retmax` 주입 확인 / 3 vs 10 sec rate 판정 / config·credentials 권한(0o600).
- **DoD**: httpClient 유닛 커버리지 95%+, 모든 안전장치 케이스 그린.

## Phase 3 — core 검색엔진 (segmenter · union · espell · queryLint · searchJob)

**목적**: recall·결정론의 심장. 검색 도메인 하드 규칙(LLM 아닌 코드).

- [ ] `src/core/segmenter/` — `operations/{probeCount,planSegments,bucketByDate}.ts` (`Count>10000`→`dp`/`edat`/`crdt` 날짜 버킷 분할로 전수 확보).
- [ ] `src/core/union/` — `operations/{mergeRecords,dedupKey,normalizeTitle,tagHitBy}.ts` (**dedup 복합키 PMID→DOI→정규화 title**, `hit_by[]`·`query_role[]` 누적).
- [ ] `src/core/espell/` — `operations/{runEspell,shouldRespell}.ts` (union 0/저조·OOV·spelling-warning 시 교정 재시도 판단).
- [ ] `src/core/queryLint/` — `operations/{lintQuery,checkParens,checkFieldTags}.ts` (괄호 짝·예약어·**따옴표/wildcard/tag가 ATM·explosion 무력화** 사전 검증).
- [ ] `src/core/searchJob/` — `operations/{createJob,getJob,updateJob,pollResults}.ts` (대량 async job·진행률·cursor).
- **참고**: `mcp-tools.md`(paper_search 내부 단계), `dispatcher.md`(guard·operationBudget), `roadmap.md`(core 모듈).
- **테스트(유닛 — recall 정확성 집중)**: segmenter(10001건→날짜 분할·경계·전수 합) / dedup(PMID 동일·DOI 동일 PMID 상이·title만 동일, 3키 우선순위) / normalizeTitle(특수문자·공백·대소문자) / tagHitBy(다중 검색식 누적) / queryLint(`"x*"` wildcard 경고·괄호 불일치·`[mh]` 오용) / shouldRespell(0건·임계) / searchJob 상태 전이(queued→running→done/failed·cursor).
- **DoD**: core 유닛 90%+. **recall calibration**(고정 fixture: N개 검색식 union이 기대 PMID 집합을 누락 0으로 포함).

## Phase 4 — adapters/eutils

**목적**: E-utility 함수별 어댑터(1함수 1파일). 파싱 정확성.

- [ ] `src/adapters/eutils/esearch.ts` (count probe·UID·**QueryTranslation** 추출·usehistory→WebEnv/query_key).
- [ ] `efetch.ts` (POST·batch 200~500·retmax/retstart·XML→`PaperRecord` **저자 구조화**).
- [ ] `esummary.ts` (요약 레코드).
- [ ] `espell.ts` (교정 제안 파싱).
- [ ] `elink.ts` (Similar Articles → `ExpansionSource`).
- [ ] `idconv.ts` (PMID↔PMCID↔DOI).
- [ ] `oaService.ts` (oa.fcgi: OA 여부·**license**·format별 URL·`UnavailableReason`).
- **참고**: `mcp-tools.md`(E-utilities 흐름), `roadmap.md`(adapters). ⚠️ `oa.fcgi`/`idconv` 실제 응답 스키마는 이 Phase에서 **live로 1회 검증 후 fixture 녹화**(설계 문서의 미검증 플래그 해소).
- **테스트(유닛 — fixture 파싱)**: 각 adapter가 녹화 XML/JSON을 정확 파싱 — esearch(count·QueryTranslation·WebEnv) / efetch(저자 LastName·ForeName·Initials·Collective·ORCID 분리, mesh[], doi, pmcid, 결측 필드) / esummary / espell(교정어) / elink(연결 PMID) / idconv(매핑) / oaService(license·format·비OA 사유). 깨진 XML·빈 결과·부분 필드 결측 케이스.
- **DoD**: 7 adapter 유닛 90%+. live smoke 1회로 fixture 신선도 확인(`@live`).

## Phase 5 — MCP 도구 (5종)

**목적**: 결정론 계약 레이어. 도구는 core/adapters의 얇은 오케스트레이션.

- [ ] `src/mcp/server/lifecycle/{createServer,startServer}.ts` (`registerTool` 패턴, deilen/atlassian).
- [ ] `src/mcp/shared/helpers/{wrapHandler,toolResult,toolError}.ts`.
- [ ] `tools/paperSearch/` — `paperSearch.ts` + `operations/`(query_lint→count_probe→date_segment→fetch_ids→fetch_records(POST·batch)→union→partial_recovery). 입력 `fetchMode`·`capStrategy`·`dateRange`·`maxRecords`·`cursor`. 출력 `per_query`·`union`·`segments`·`warnings`·`errors`·`partial`·`missing_pmids`·`reproducibility(SearchManifest)`. **async**: `paper_search_start`/`paper_search_status`/`paper_search_results`.
- [ ] `tools/meshLookup/` (db=mesh → descriptor·scr·entry 구분).
- [ ] `tools/fetchFulltext/` — `operations/`(idconv→oaService→다운로드, per-format 실패·license).
- [ ] `tools/setup/`·`tools/authCheck/` (Phase 6 web UI와 연계, authCheck=EInfo reachability).
- **참고**: `mcp-tools.md`(TS 계약·annotations), `spec.md`(데이터 흐름·비채택).
- **테스트(통합 — 모킹 httpClient)**: paper_search(count probe→10k 초과 segment→POST batch→union, `partial`·`missing_pmids` 격리, async start/status/results 폴링, SearchManifest 생성) / mesh_lookup(매핑 딕셔너리) / fetch_fulltext(OA 저장·비OA 링크·format별 실패) / setup·auth_check / annotations(readOnly·idempotent·async) 정확. **부분 실패**: 일부 batch 5xx → 성공분 보존+실패 격리.
- **DoD**: 5 도구 통합 그린, async·부분실패·재현성 필드 검증.

## Phase 6 — setup web UI

**목적**: 안전한 설정(LLM이 api_key 미접근). atlassian setup 차용.

- [ ] `src/mcp/tools/setup/` web server(127.0.0.1 라우트 `/`·`/status`·`/test`·`/submit`, CSRF JSON 강제) + 브라우저 오픈(`@ogham/cross-platform` launcher).
- [ ] config.json(비밀 외) / credentials.json(api_key, `0o600`) 분리 저장 + 권한 hardening.
- [ ] `auth_check` 연계(저장 후 EInfo reachability·rate 표시).
- **참고**: `setup.md`, atlassian `skills/setup`·`src/core/{configManager,authManager}`·`src/mcp/tools/setup`.
- **테스트(통합)**: config 저장→로드 round-trip / credentials 권한 0o600(권한 완화 시 재설정) / route 핸들러(/submit 검증·/test reachability) / **키 누설 차단**(도구 응답·로그에 api_key 미포함).
- **DoD**: 브라우저 설정→config/credentials 생성, auth_check 연동, 키 비노출 테스트 그린.

## Phase 7 — 스킬 + 에이전트

**목적**: 인터페이스 + 오케스트레이션 + 비결정 추론. (마크다운, 코드 없음)

- [ ] `skills/search/` — `SKILL.md`(complexity complex, Dispatcher) + `references/{state-machine.md, intent.md, modes.md}` (상태 6+종결 2·전이표·guard·USER_REFINE·interactive/--auto).
- [ ] `skills/query/SKILL.md`(① 검색식만) · `skills/download/SKILL.md`(OA PDF+링크) · `skills/setup/SKILL.md`(web UI 안내).
- [ ] `skills/_shared/{mcp-tools.md, eutils.md}` (도구 계약 미러·E-utilities 사실, lazy SSoT).
- [ ] `agents/paper-search-expert.md` — frontmatter(name·model·tools `[Read,mcp_mesh_lookup,mcp_paper_search]`·maxTurns) + 내부 2모드.
- [ ] `skills/_shared/{query-strategy.md, rerank.md}` — 생성(QueryRole 6종·ESpell·recall 게이트)·재랭킹(pre-score 후 top-N 기준) **SSoT**. (`agents/`는 서브디렉토리 불가)
- **참고**: `skills.md`(frontmatter·노출 4·progressive disclosure), `agents.md`(2모드·hand-off), `dispatcher.md`(상태머신), `spec.md`(흐름).
- **테스트**: SKILL.md/agent frontmatter 스키마 검증(필수 필드·`user_invocable`·trigger) / 노출 스킬 4 인식 / `Task(subagent_type:"entrez:paper-search-expert")` 호출 가능 / (수동 시나리오) intent 분류 4종·USER_REFINE 루프.
- **DoD**: 노출 4 + 에이전트 인식, frontmatter 검증 그린.

## Phase 8 — e2e · 빌드 · 검증 · 릴리스

**목적**: 전체 파이프라인 완성도 보증.

- [ ] **e2e(fixture, `@e2e`)** — 녹화 NCBI 응답으로 전 시나리오 결정론 재현:
  - full search(자연어→검색식 다중→union→재랭킹→레코드, recall 누락 0).
  - query-only(검색식만 반환, 검색 안 함).
  - download(OA PDF 저장·sha256 / 비OA 링크 리포트).
  - mesh_lookup(용어→표준 MeSH).
  - **대량**(10k 초과→date segmentation→async job→cursor 전수).
  - **recall 게이트**(union 0→broad 재생성→`recallIter` 수렴).
  - **부분 실패**(일부 batch 실패→`partial` 성공분 보존).
  - **재현성**(동일 입력→`SearchManifest` 동일 checksum).
- [ ] **e2e(live smoke, `@live`)** — 실제 eutils 소량: 계약·스키마·필드 존재, rate limit 준수, oa.fcgi/idconv 신선도.
- [ ] `buildMcpServer.mjs` 번들 → `bridge/mcp-server.cjs`, 빌드 산출 e2e(번들 서버 기동→도구 5 등록).
- [ ] 커버리지 게이트(core/adapters 90%+, 전체 85%+) · `typecheck`·`lint` 그린.
- [ ] **비채택 대조**(`spec.md`): 단일 plugin에 멀티소스 미포함·node 직접 실행 없음·전건 LLM 재랭킹 없음(pre-score 확인)·동기 대량 응답 없음.
- **DoD**: 전 e2e 시나리오 통과, live smoke 그린, 커버리지·lint·typecheck·build 전 통과, 플러그인 등록·도구·스킬·에이전트 인식 확인.

---

## 의존성 그래프

```
Phase 0 (스캐폴딩)
  → Phase 1 (상수·타입)
    → Phase 2 (core 네트워크: httpClient·config)
      → Phase 3 (core 검색엔진: segmenter·union·espell·queryLint·searchJob)
        → Phase 4 (adapters/eutils)
          → Phase 5 (MCP 도구 5)
            → Phase 6 (setup web UI)   ┐
            → Phase 7 (스킬·에이전트)   ├ 5 완료 후 병렬 가능
              → Phase 8 (e2e·빌드·검증) ┘ (6·7 완료 후)
```

## 진행 규칙

1. 각 Phase 시작 전 매핑된 `.metadata` 문서를 읽고, 완료 후 그 문서와 대조 검수.
2. 모든 코드는 0.1 규약(FCA·1함수1파일·문자열 상수·단방향·hook 없음) 준수 — ESLint로 강제.
3. 형식이 모호하면 `plugins/deilen`·`plugins/r-statistics`·`plugins/atlassian` 실제 파일을 레퍼런스로.
4. **테스트는 산출물과 동시 작성**(Phase DoD = 테스트 그린). NCBI HTTP 모킹은 `core/httpClient` 한 곳에서만(DI).
5. `spec.md`의 **비채택** 목록을 구현이 위반하지 않는지 각 Phase 말에 점검.
6. 설계 변경 발생 시 `.metadata/entrez/` 해당 문서를 먼저 갱신한 뒤 구현(문서가 정본).
7. `oa.fcgi`·`idconv` 등 미검증 외부 명세는 Phase 4에서 live 1회 검증→fixture 녹화로 확정.

## 최종 완료 체크리스트 (릴리스 게이트)

- [ ] 유닛 커버리지 core/adapters 90%+, 전체 85%+
- [ ] e2e(fixture) 전 시나리오 그린 · e2e(live smoke) 그린
- [ ] recall calibration(누락 0) · 재현성(SearchManifest checksum) 검증
- [ ] E-utilities 제약 검증: 10k segmentation · auto-POST · 429/rate(3·10) · WebEnv 만료 대응
- [ ] 인라인 문자열 리터럴 0 · 단방향 의존 위반 0 (ESLint)
- [ ] FCA: 각 프랙탈 `INTENT.md` 존재
- [ ] 키 비노출(api_key가 LLM 응답·로그에 없음)
- [ ] `yarn build`·`test`·`test:e2e`·`typecheck`·`lint` 전 통과
- [ ] plugin 등록 → 스킬 4·에이전트 1·MCP 5 인식
