# entrez — 로드맵

## 설계 완료 (이 spec)

9개 설계 문서(README·architecture·spec·mcp-tools·skills·agents·dispatcher·setup·roadmap) + L4 확정본 v3(2026-06-26, codex `125bc270`·antigravity `2aed2cc7` 크로스체크 반영) 크로스체크 완료. 골격·정책·계약 확정.

- **정체성·범위**: NCBI E-utilities 전용(`db` 파라미터, 단일 호스트). 핵심 목표 = recall(누락 방지). 비범위(Europe PMC·Crossref·Scholar)는 형제 plugin.
- **아키텍처**: Dispatcher(search 스킬 겸·상태머신) · 에이전트 1(`paper-search-expert`, 내부 2모드) · 노출 스킬 4(search·query·download·setup) · MCP 5(`paper_search`·`mesh_lookup`·`fetch_fulltext`·`setup`·`auth-check`) · atlassian httpClient(retry·429 backoff·auto-POST·SSRF allowlist).
- **E-utilities 제약 반영**: 10,000 UID 상한→날짜 segmentation, EFetch GET 414→POST 전환, History WebEnv ~1시간 만료→PMID snapshot, retmax 명시, rate(3/10·`tool`+`email` 필수).
- **코드 규약**: FCA(프랙탈+부속품 격리, 프랙탈별 `index.ts`+`INTENT.md`)·1함수1파일·hook 미사용·문자열 리터럴 전량 `as const` enum + constants.
- **확정 결정**: node→MCP(external-fetch-policy 회색지대 소멸), 이름 `entrez`, union=MCP 결정론(dedup 복합키), 에이전트 1+모드 분리, Dispatcher 경량+SEARCH 내부 단계화, 대량 async job, 전건 LLM 재랭킹 비채택(pre-score 후 top-N), SearchManifest 재현성.

## 이 spec에서 확정한 미결

- **에이전트 수·모드 분리** → [agents.md](./agents.md) (codex 절충: 물리 1 + 내부 2모드 논리 분리).
- **Dispatcher 상태 수** → [dispatcher.md](./dispatcher.md) (상태 6 + 종결 2, SEARCH 내부 단계는 코드로 은닉).
- **setup web UI 구조** → [setup.md](./setup.md) (atlassian setup 차용 확정).
- **도구 I/O 계약** → [mcp-tools.md](./mcp-tools.md) (5종, async·부분실패·재현성 필드 확정).

## 남은 구현 디테일 (구현 단계)

| 영역                  | 항목                                                                  | 비고                                                                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/core`            | `httpClient`                                                          | auto-POST(id>~200 or URL>2000자)·429 backoff·retry·SSRF eutils allowlist·`api_key`/rate 주입.                                                                                                                                                                                                          |
| `src/core`            | `segmenter`                                                           | `Count>10000` 시 `dp`/`edat`/`crdt` 날짜 버킷 분할(전수 확보).                                                                                                                                                                                                                                         |
| `src/core`            | `union`                                                               | dedup 복합키 `PMID→DOI→정규화 title`, `hit_by[]`·`query_role[]` 누적.                                                                                                                                                                                                                                  |
| `src/core`            | `espell`                                                              | union 0/저조·OOV·spelling-warning 시 교정 재시도.                                                                                                                                                                                                                                                      |
| `src/core`            | `queryLint`                                                           | 괄호 짝·예약어·태그 오용·매핑 무력화(따옴표·wildcard·tag) 사전 검증.                                                                                                                                                                                                                                   |
| `src/core`            | `searchJob`                                                           | 대량 async job(start/status/results 또는 job_id 폴링)·cursor.                                                                                                                                                                                                                                          |
| `src/core`            | `sourceResolver`·`config`                                             | `db` 분기 · config.json/credentials.json(0o600) 로드·저장.                                                                                                                                                                                                                                             |
| `src/adapters/eutils` | `esearch`·`efetch`·`esummary`·`espell`·`elink`·`idconv`·`oaService`   | EFetch/ESummary batchSize 200~500·retmax 명시. `oaService`=oa.fcgi(OA·license 판별), `idconv`=PMID↔PMCID↔DOI. oa.fcgi/idconv 명세 구현 시 검증.                                                                                                                                                        |
| `src/mcp/tools`       | `paperSearch`·`meshLookup`·`fetchFulltext`·`setup`·`authCheck`        | I/O 계약 [mcp-tools.md](./mcp-tools.md). `paperSearch` 내부: count probe→segment→POST·batch→union.                                                                                                                                                                                                     |
| `skills/_shared`      | `query-strategy.md`·`rerank.md`                                       | 검색식 방법론(QueryRole·ESpell·recall 게이트)·재랭킹 기준 SSoT. lazy. (`agents/`는 서브디렉토리 불가)                                                                                                                                                                                                  |
| `skills`              | `search`·`query`·`download`·`setup` + `_shared/{mcp-tools,eutils}.md` | search=Dispatcher 겸(`references/{state-machine,intent,modes}.md`). `mesh`는 MCP로만.                                                                                                                                                                                                                  |
| `types`               | `SearchManifest`                                                      | plugin version·base URL·db·raw queries·QueryTranslation·counts·timestamp·retmax/retstart/batchSize·api_key 사용여부(값 제외)·WebEnv/query_key·fetched PMID checksum·warnings/caps.                                                                                                                     |
| `core`                | 캐싱                                                                  | `mesh_lookup`=versioned(연간 MeSH 갱신), ESearch count=short TTL, PMID metadata=긴 TTL(ahead-of-print 갱신 표시).                                                                                                                                                                                      |
| `scripts`             | `buildMcpServer.mjs`                                                  | → `bridge/mcp-server.cjs`(deilen/r-statistics 빌드 패턴).                                                                                                                                                                                                                                              |
| 테스트                | `vitest`                                                              | 단위 + segmentation/POST 전환/dedup 복합키/부분실패 격리 calibration.                                                                                                                                                                                                                                  |
| enum                  | `types/enums.ts`                                                      | `Db`·`SortOrder`·`DateType`·`DateField`·`RecordField`·`QueryRole`·`Breadth`·`MeshMatch`·`FulltextFormat`·`UnavailableReason`·`RateLimit`·`EutilFn`·`RetMode`·`HttpMethod`·`FieldTag`·`FetchMode`·`CapStrategy`·`JobStatus`·`ExpansionSource`·`IntentType`·`ExecutionMode`·`ErrorCode` 전량 `as const`. |

## 이후 (별도 작업 — 마스터플랜 #2축 연계)

- **형제 plugin**: `europepmc`·`crossref` — "한 API=한 plugin" 원칙. 각자 호출법·필드 상이하므로 분리. entrez와 같은 RAG ①②③ + 누락방지 골격 재사용, dedup 병합 시 DOI를 secondary 키로.
- **#2축 상위 멀티소스 union 스킬**: entrez·europepmc·crossref 결과를 상위에서 union(dedup 복합키 `PMID→DOI→정규화 title`)하는 메타 검색. 단일 plugin에 멀티소스를 넣지 않고(비채택), 상위 오케스트레이션으로 결합.
- **마스터플랜 연계**: [[research-automation-harness-master-plan]] #2축(검색·수집)의 첫 plugin이 entrez. r-statistics(분석)·논문 작성(C축)과 데이터 주입으로 결합되는 전체 파이프라인의 입력단.

## 참고 출처

- 설계 정본: maencof vault L4 `entrez-l4`(v3, codex `125bc270`·antigravity `2aed2cc7` 크로스체크). 가이드 [[ncbi-eutilities-pubmed-api]], 핸드오프 [[handoff-pubmed-search-skill]].
- 합성 기반: `r-statistics`(3-Layer·Dispatcher·에이전트·빌드 패턴) = 기반 · `atlassian`(setup web UI·httpClient·configManager/authManager) = 강참고.
- FCA 시행체: `plugins/filid`. 빌드 패턴: `plugins/deilen` · `plugins/r-statistics`.
