# entrez — 설계 메타데이터

> **`entrez` = Claude를 NCBI E-utilities(PubMed) "학술 논문 검색 전문가"로 만드는 Claude Code plugin.**
> 유일한 책임은 검색 **누락 방지(recall)** — 자연어 주제를 다양한 검색식으로 펼쳐 PubMed/PMC에서 관련 논문을 한 건도 빠뜨리지 않고 끌어모은다.

이 디렉토리는 `entrez` 플러그인의 **설계 명세(spec)** 다. 실제 구현 전 단계의 아키텍처 문서이며, r-statistics `.metadata/` 패턴을 따른다.

## 정체성 & 범위

- **이름** `entrez` — NCBI 통합 검색 시스템(Entrez)의 정식명. pubmed·pmc·mesh를 포괄하며 `utils` 혼동을 회피한다.
- **범위**: NCBI E-utilities 전용(`db` 파라미터). 단일 호스트(`eutils.ncbi.nlm.nih.gov`) + 단일 db 계열(pubmed·pmc·mesh)만 다룬다. Europe PMC·Crossref·Google Scholar 등 이종 API는 호출 규약이 상이하므로 **형제 plugin**으로 분리한다. 원칙은 **"한 API = 한 plugin"**.
- **핵심 목표**: 검색 **누락 방지(recall)** 최우선. 어휘·도구·게이트·리소스는 모두 E-utilities 기준으로만 작성한다.

## 입력 / 출력

- **입력**: 자연어 연구 주제 / 가설 (또는 PMID·PMCID known-item)
- **출력**: 중복 제거된 논문 레코드(메타데이터 + 초록) + PubMed 검색식 + 재현 가능한 `SearchManifest` + (옵션) PMC OA 전문 PDF

## 문서 인덱스

| 문서                                 | 내용                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| [README.md](./README.md)             | 본 문서 — 설계 메타데이터 인덱스, 정체성·범위·3-Layer 개요                                                     |
| [architecture.md](./architecture.md) | 3-Layer 아키텍처, 디렉토리 구조, FCA·코드 규약, atlassian httpClient 차용                                      |
| [spec.md](./spec.md)                 | 컴포넌트 책임, RAG ①②③ 데이터 흐름, SSoT 경계, dedup·재현성, 비채택 결정                                       |
| [mcp-tools.md](./mcp-tools.md)       | MCP 도구 5종 스펙 (`paper_search`·`mesh_lookup`·`fetch_fulltext`·`setup`·`auth_check`) + TypeScript 인터페이스 |
| [skills.md](./skills.md)             | 노출 스킬 4종 (`search`·`query`·`download`·`setup`) + `_shared/` lazy 리소스                                   |
| [agents.md](./agents.md)             | 에이전트 `paper-search-expert` ×1 (생성/재랭킹 내부 2모드) + `references/`                                     |
| [dispatcher.md](./dispatcher.md)     | `search` 스킬 상태머신, intent 분류, `SEARCH` 내부 단계, 실행 모드                                             |
| [setup.md](./setup.md)               | `setup` web UI 설정, credentials/config 분리, `auth_check` reachability                                        |
| [roadmap.md](./roadmap.md)           | E-utilities 제약 대응 구현 디테일 / 이후 항목                                                                  |

## 3-Layer 한눈에

```
[Dispatcher]  search 스킬 — 상태머신 오케스트레이션 (intent 분류 + 전이 + interactive/--auto)
[Agent]       paper-search-expert ×1 — 생성 모드(WHAT·recall) / 재랭킹 모드(RANK·precision)
[Skill]       search · query · download · setup
                 └ lazy: _shared/{mcp-tools,eutils,query-strategy,rerank}.md
[MCP]         paper_search · mesh_lookup · fetch_fulltext · setup · auth_check  (결정론·계약)
[HTTP]        atlassian httpClient (fetch + retry + 429 backoff + auto-POST + SSRF eutils allowlist)
[NCBI]        E-utilities: ESearch → EFetch/ESummary/ESpell/ELink (단일 호스트 + db)
```

## 핵심 원리

비결정 LLM(Agent)을 **결정적 상태머신(Dispatcher) + 결정적 실행(MCP)** 이 위아래로 감싼다. 검색 도메인의 모든 하드 규칙(10,000 UID 상한·EFetch POST 전환·rate limit·query lint)은 LLM이 아닌 결정론적 service가 책임진다.

- **recall 최우선**: RAG ①②③ — `①LLM 검색식 다양화(QueryRole·ESpell) → ②MCP 결정론 union(segment·POST·dedup) → ③LLM 재랭킹(pre-score 후 top-N)`. LLM은 검색식을 *다양화*해 펼치고 MCP가 *전수 수집*해 누락을 0으로 만든다. 재랭킹은 정렬만 — 레코드를 제거하지 않는다.
- `interactive`(기본): 검색식 제시·`USER_REFINE`·union 표시, 품질 향상은 사용자 대화로
- `--auto`(pipeline): 무인 수렴 + `operationBudget` 자동 종료 + 파일 출력(`date_tag`)

## 코드 규약 (구현 시)

- **FCA** (Fractal Context Architecture): 프랙탈 분리 + 부속품 격리 + 상향식 지연 로딩, 프랙탈별 `index.ts` + `INTENT.md`
- **1함수 1파일** (`operations/*.ts`)
- **모든 문자열 리터럴은 `as const` object enum + constants** (`src/types/enums.ts`, `src/constants/{messages,defaults,paths}.ts`) — 인라인 금지
- **hook 미사용**, 빌드 `scripts/buildMcpServer.mjs` → `bridge/mcp-server.cjs`
