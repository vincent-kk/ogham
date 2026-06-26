# entrez — 아키텍처

## 정체성 (설계의 닻)

**Claude를 NCBI E-utilities(PubMed) "학술 논문 검색 전문가"로 만드는 plugin.** 설계의 모든 결정은 단 하나의 닻에 묶인다 — 검색 **누락 방지(recall)**. 자연어 주제를 다양한 검색식으로 펼쳐 PubMed/PMC에서 관련 논문을 한 건도 빠뜨리지 않고 끌어모으는 것이 유일한 목표다.

범위는 **NCBI E-utilities 전용**(`db` 파라미터)으로 못박는다. 단일 호스트(`eutils.ncbi.nlm.nih.gov`) + 단일 db 계열(pubmed·pmc·mesh)만 다루고, Europe PMC·Crossref·Google Scholar 같은 이종 API는 호출 규약이 상이하므로 **형제 plugin**으로 분리한다. 원칙은 **"한 API = 한 plugin"**. 어휘·도구·게이트·리소스는 모두 E-utilities 기준으로만 작성한다.

## 3-Layer

판단 프레임워크: MCP=결정적 실행(계약), Skill=실행계약 골격, Agent=비결정 추론, Dispatcher=결정적 오케스트레이션.

```
[Dispatcher] search 스킬 — 상태머신 오케스트레이션 (intent 분류 + 전이 + interactive/--auto)
     ↓ (Task)
[Agent]      paper-search-expert ×1 — 생성 모드(WHAT·recall) / 재랭킹 모드(RANK·precision)
                                       (추천만; 전이는 Dispatcher)
     ↓ (참조)
[Skill]      search · query · download · setup
                └ lazy: _shared/{mcp-tools,eutils,query-strategy,rerank}.md
     ↓ (mcp_*)
[MCP]        paper_search · mesh_lookup · fetch_fulltext · setup · auth_check  (결정론·계약)
     ↓ (HTTP)
[HTTP]       atlassian httpClient — fetch + retry + 429 backoff + auto-POST + SSRF(eutils allowlist)
     ↓
[NCBI]       E-utilities: ESearch → EFetch/ESummary/ESpell/ELink (단일 호스트 + db)
```

**의존성 단방향**: Dispatcher → Agent → Skill → MCP → httpClient → NCBI. 역방향 호출 금지.

**핵심 원리**: 비결정 LLM(Agent)을 결정적 상태머신(Dispatcher) + 결정적 실행(MCP)이 감싼다. 검색 도메인의 하드 규칙(10k cap·POST 전환·rate·query lint)은 LLM이 아닌 deterministic service에 둔다.

**역할 분담(SSoT)**: agent=추론(WHAT) · skill=절차(HOW) · MCP=계약(I/O). 검색식 방법론·재랭킹 기준은 `skills/_shared/{query-strategy,rerank}.md`(agent가 Read로 로드)가, 오케스트레이션 절차는 `search` SKILL.md가, 도구 I/O 계약은 MCP + `_shared/mcp-tools.md`가, E-utilities db·필드·제약은 `_shared/eutils.md`(lazy)가 단독 소유한다. agent는 물리적으로 1개이되 생성/재랭킹의 **prompt·schema·평가기준을 분리**해 self-bias를 억제한다. 상세 [agents.md](./agents.md) · [spec.md](./spec.md).

## Dispatcher 구현 결정

Claude Code plugin에서 결정적 코드 실행 자리는 MCP 서버뿐이다(hook 미사용). 따라서 `search` Dispatcher는 **경량 유지 + 내부 단계화** 원칙을 따른다:

- **상태/전이 규칙** = `skills/search/references/state-machine.md` (문서로 명시, LLM이 따름). 상태 6 + 종결 2: `INTAKE·CLASSIFY·QUERY_GEN·SEARCH·RANK·COMPLETE` + `FAILED·BLOCKED_NEEDS_USER`. `interactive`엔 `QUERY_GEN → USER_REFINE → SEARCH` 검토 루프.
- **검색 도메인 하드 규칙** = MCP `paper_search` 내부 결정론 단계(`query_lint → count_probe → date_segment → fetch_ids → fetch_records(POST·batch) → partial_recovery`). 상태로 노출하지 않아 Dispatcher를 경량으로 유지한다.
- **수렴 guard** = `recallIter ≤ 4` + `operationBudget`(maxRequests·maxRecords·maxWallMs) + `rateRetry ≤ 5`. 전이 수가 아닌 budget으로 종료. 대량 검색은 `SEARCH`가 async job을 생성해 진행률(MCP progress)을 피드백한다.

→ "비결정 위험"은 명시적 전이표 + iteration guard + operationBudget로 박아 억제. 상세 [dispatcher.md](./dispatcher.md).

## 디렉토리 구조

```
plugins/entrez/
├── .claude-plugin/plugin.json          # 매니페스트 (name, version, skills, mcpServers)
├── .mcp.json                            # MCP 서버 등록 → bridge/mcp-server.cjs
├── bridge/mcp-server.cjs                # 빌드 산출물 (번들 MCP 서버)
├── skills/                              # 노출 4 (마크다운 only)
│   ├── search/                          # 메인 오케스트레이터 (= Dispatcher)
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── state-machine.md         # 상태 6 + 종결 2 · 전이표 · guard(recallIter·operationBudget)
│   │       ├── intent.md                # intent 분류 (FULL_SEARCH·QUERY_ONLY·DOWNLOAD·NEEDS_CLARIFICATION)
│   │       └── modes.md                 # interactive / --auto
│   ├── query/SKILL.md                   # 자연어 → PubMed 검색식만 (검색 X)
│   ├── download/SKILL.md                # PMID/PMCID → OA PDF + 비OA 링크
│   ├── setup/SKILL.md                   # web UI 설정 안내
│   └── _shared/                         # skill lazy 공유 리소스 (agent 참조 포함)
│       ├── mcp-tools.md                 # 도구 I/O 계약 미러 (SSoT: MCP)
│       ├── eutils.md                    # E-utilities db·필드·제약 (lazy)
│       ├── query-strategy.md            # 생성 모드 — QueryRole 다중 검색식 방법론 (SSoT)
│       └── rerank.md                    # 재랭킹 모드 — pre-score 후 의미 점수 기준 (SSoT)
├── agents/                              # 평면만 — 서브디렉토리 불가(로더가 *.md 전부 에이전트로 취급)
│   └── paper-search-expert.md           # frontmatter: name, model, tools, maxTurns
├── src/                                 # MCP 서버 (TypeScript, FCA)
│   ├── constants/
│   │   ├── paths.ts                     # 경로 상수 + 헬퍼 (outDir(id) 류)
│   │   ├── defaults.ts                  # DEFAULT_*, 한계값 (batchSize, retmax, 10k cap, operationBudget…)
│   │   └── messages.ts                  # 모든 사용자/에러 문자열 리터럴
│   ├── types/
│   │   ├── enums.ts                     # as const 상수 (Db, FetchMode, CapStrategy, QueryRole, JobStatus…)
│   │   ├── config.ts                    # zod 스키마 (api_key·tool·email·db)
│   │   ├── record.ts                    # PaperRecord (pmid·doi·pmcid·authors[]·hit_by[]·query_role[]…)
│   │   └── manifest.ts                  # SearchManifest (재현성 스냅샷)
│   ├── core/                            # FCA 프랙탈 (결정론 검색 엔진)
│   │   ├── httpClient/                  # atlassian 차용: fetch + retry + 429 backoff + auto-POST + SSRF
│   │   │   ├── index.ts                 # 배럴
│   │   │   ├── INTENT.md                # 프랙탈 경계 (Korean)
│   │   │   └── operations/{request,withRetry,backoff429,autoPost,ssrfGuard}.ts
│   │   ├── sourceResolver/              # db 해석 (pubmed·pmc·mesh) + base URL
│   │   │   ├── index.ts · INTENT.md
│   │   │   └── operations/{resolveDb,buildBaseUrl}.ts
│   │   ├── config/                      # credentials/config 로드·검증 (rate 판정)
│   │   │   └── operations/{loadConfig,loadCredentials,resolveRateLimit}.ts
│   │   ├── union/                       # dedup 복합키 합집합 (PMID→DOI→정규화 title)
│   │   │   └── operations/{mergeRecords,dedupKey,normalizeTitle,tagHitBy}.ts
│   │   ├── segmenter/                   # 10k UID 상한 → 날짜 segmentation
│   │   │   └── operations/{probeCount,planSegments,bucketByDate}.ts
│   │   ├── espell/                      # 철자 교정 전처리 (union 저조 시 재시도 판단)
│   │   │   └── operations/{runEspell,shouldRespell}.ts
│   │   ├── queryLint/                   # 검색식 사전 검증 (괄호 짝·예약어·태그 오용)
│   │   │   └── operations/{lintQuery,checkParens,checkFieldTags}.ts
│   │   └── searchJob/                   # async 잡 (대량 검색 진행률·cursor)
│   │       └── operations/{createJob,getJob,updateJob,pollResults}.ts
│   ├── adapters/eutils/                 # E-utilities 함수별 어댑터 (1함수 1파일)
│   │   ├── esearch.ts                   # ESearch (count probe·UID 목록·QueryTranslation)
│   │   ├── efetch.ts                    # EFetch (POST·batch·retmax/retstart)
│   │   ├── esummary.ts                  # ESummary (요약 레코드)
│   │   ├── espell.ts                    # ESpell (철자 교정)
│   │   ├── elink.ts                     # ELink (Similar Articles 확장)
│   │   ├── idconv.ts                    # idconv (PMID↔PMCID↔DOI)
│   │   └── oaService.ts                 # oa.fcgi (OA·license 판별)
│   ├── mcp/                             # FCA 프랙탈
│   │   ├── server/lifecycle/{createServer,startServer}.ts
│   │   ├── tools/                       # 도구 5종 (1도구 1디렉토리)
│   │   │   ├── paperSearch/{index.ts, paperSearch.ts, operations/*.ts}
│   │   │   ├── meshLookup/{index.ts, meshLookup.ts}
│   │   │   ├── fetchFulltext/{index.ts, fetchFulltext.ts, operations/*.ts}
│   │   │   ├── setup/{index.ts, setup.ts}
│   │   │   └── authCheck/{index.ts, authCheck.ts}
│   │   └── shared/helpers/{wrapHandler,toolResult,toolError}.ts
│   ├── lib/                             # 부속품(Organ) 격리: atomicWrite, logger, xmlParse…
│   ├── utils/                           # isoNow, randomId, sha256, isFileNotFound…
│   └── index.ts                         # 배럴
├── package.json, tsconfig.json, tsconfig.build.json
├── README.md, INTENT.md, CLAUDE.md
└── scripts/buildMcpServer.mjs
```

## 코드 규약

### FCA (Fractal Context Architecture)

- **프랙탈 분리**: `src/core/{httpClient,sourceResolver,config,union,segmenter,espell,queryLint,searchJob}` · `src/adapters/eutils` · `src/mcp/{server,tools,shared}` 각각 자기유사 독립 단위(Bounded Context). 각 프랙탈에 `index.ts` 배럴 + `INTENT.md`(Purpose/Structure/Conventions/Boundaries/Dependencies, Korean).
- **부속품 격리**: 공유 유틸은 `lib/`·`utils/` 리프에 격리, INTENT.md 미부여.
- **상향식 지연 로딩**: 리프 → 루트 최소 컨텍스트.

### 1함수 1파일

- `operations/*.ts`는 단일 export 함수. 예: `core/segmenter/operations/planSegments.ts` → `planSegments()`.
- `adapters/eutils/*.ts`는 E-utility 함수당 1파일(`esearch`·`efetch`·`esummary`·`espell`·`elink`·`idconv`·`oaService`).
- 도구 핸들러는 `tools/{tool}/{tool}.ts` 메인 + `operations/` 헬퍼.

### 문자열 리터럴 상수화 (핵심 규약)

**모든 문자열 리터럴은 `as const` object enum 또는 constants에서 import** — 인라인 금지. 값 집합(enum류)은 `src/types/enums.ts`, 사용자/에러 메시지는 `src/constants/messages.ts`, 기본값·한계값은 `src/constants/defaults.ts`, 경로는 `src/constants/paths.ts`.

패턴:

```ts
export const Db = { PUBMED: "pubmed", PMC: "pmc", MESH: "mesh" } as const;
export type Db = (typeof Db)[keyof typeof Db];
```

enum 카탈로그 (`src/types/enums.ts`, 전 22종):

| enum                | 용도 (대표 멤버)                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `Db`                | 검색 대상 db (`PUBMED`·`PMC`·`MESH`)                                                         |
| `SortOrder`         | ESearch 정렬 (relevance·pub_date…)                                                           |
| `DateType`          | 날짜 종류 (pdat·edat·crdt)                                                                   |
| `DateField`         | segmentation 기준 필드 (`dp`·`edat`·`crdt`)                                                  |
| `RecordField`       | `PaperRecord` 필드 키                                                                        |
| `QueryRole`         | 검색식 역할 (`ATM_BROAD`·`MESH_EXPLODED`·`MESH_NOEXP`·`TIAB_SYNONYM`·`ALL_FIELDS`·`SIMILAR`) |
| `Breadth`           | 검색식 넓이 (broad·narrow)                                                                   |
| `MeshMatch`         | MeSH 매칭 종류 (descriptor·scr·entry)                                                        |
| `FulltextFormat`    | 전문 포맷 (`PDF`·`XML`·`TAR`)                                                                |
| `UnavailableReason` | 전문 미제공 사유                                                                             |
| `RateLimit`         | rate 한계 (no_key=3/s·with_key=10/s)                                                         |
| `EutilFn`           | E-utility 함수 (esearch·efetch·esummary·espell·elink)                                        |
| `RetMode`           | retmode (xml·json)                                                                           |
| `HttpMethod`        | `GET`·`POST` (auto-POST 전환)                                                                |
| `FieldTag`          | PubMed 필드 태그 (`mh`·`tiab`·`mh:noexp`…) — 코드 조립용                                     |
| `FetchMode`         | 수집 깊이 (`IDS_ONLY`·`SUMMARY`·`ABSTRACTS`·`FULL`)                                          |
| `CapStrategy`       | 10k 초과 대응 (`WARN`·`DATE_SEGMENT`·`ABORT`)                                                |
| `JobStatus`         | async 잡 상태 (queued·running·done·failed)                                                   |
| `ExpansionSource`   | 확장 출처 (similar_articles…)                                                                |
| `IntentType`        | Dispatcher intent (`FULL_SEARCH`·`QUERY_ONLY`·`DOWNLOAD`·`NEEDS_CLARIFICATION`)              |
| `ExecutionMode`     | 실행 모드 (`interactive`·`auto`)                                                             |
| `ErrorCode`         | 표준 에러 코드                                                                               |

**예외**: agent가 생성하는 검색식 *본문*은 데이터이지 enum이 아니다(자유 텍스트). 다만 코드가 검색식을 *조립*할 때 쓰는 `FieldTag`(`[mh]`·`[tiab]` 등)만 상수로 둔다.

### 기타

- **hook 미사용** (사용자 결정).
- 빌드: `scripts/buildMcpServer.mjs` → `bridge/mcp-server.cjs` (deilen/r-statistics 패턴).
- **에이전트 등록**: `plugin.json`에 `agents` 필드 없음 — `agents/` 자동 발견(filid 동일).
- **subprocess 호출**: CLI/spawn은 `@ogham/cross-platform` 경유 — `child_process` 직접 사용 금지. 취소는 `AbortSignal`.
- **타입 정본**: `PaperRecord`(저자 구조화 — LastName·ForeName·Initials·CollectiveName·ORCID 분리)·`SearchManifest`는 `src/types/`가 정본. zod로 런타임 검증.

## httpClient 차용 (atlassian)

검색 엔진의 네트워크 계층은 **atlassian plugin의 `http-client`를 차용**한다. 별도 fetcher runner 없이 MCP 서버 내부에서 직접 fetch하되, atlassian이 검증한 안전장치를 그대로 가져와 `src/core/httpClient/`에 격리한다.

- **fetch wrapper**: Node 내장 `fetch` 래퍼. timeout·encoding·에러 정규화.
- **retry + 429 backoff**: 일시 오류(5xx·네트워크)는 지수 backoff 재시도. NCBI rate 초과(429/`Too Many Requests`)는 backoff 후 재시도하되 `rateRetry ≤ 5` guard로 종료. 키 유무에 따라 3/s vs 10/s(`RateLimit`)를 클라이언트가 강제한다.
- **auto-POST 전환**: EFetch/ESummary에서 UID가 많아(`>~200` 또는 URL `>2000`자) GET이 414를 유발하면 자동으로 `POST`(`application/x-www-form-urlencoded`)로 전환(`HttpMethod`). 호출부는 의식하지 않는다. (대안: History `WebEnv + query_key + retstart + retmax` 페이징.)
- **SSRF allowlist**: `eutils.ncbi.nlm.nih.gov`(+ idconv/oa.fcgi 호스트) 단일 allowlist + IP/hostname 분류(atlassian `ip.ts` 차용). 사설망·리다이렉트 우회를 차단해 "단일 호스트" 범위 원칙을 코드로 강제한다.
- **필수 파라미터 주입**: 모든 호출에 NCBI 필수 `tool`·`email`과 (있으면) `api_key`를 자동 부착하고, `retmax`는 항상 명시(기본 20 의존 금지)한다.
