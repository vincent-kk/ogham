# entrez

Claude Code용 NCBI E-utilities(PubMed · PMC · MeSH) 학술 논문 검색 플러그인.

> Claude를 NCBI E-utilities **학술 논문 검색 전문가**로 만든다. 설계의 단 하나의 닻은 검색 **누락 방지(recall)** — 자연어 주제를 다양한 PubMed 검색식으로 펼쳐 관련 논문을 한 건도 빠뜨리지 않고 끌어모은다.

## 핵심 기능

- **recall 최우선 검색** — LLM이 주제를 다중 역할 검색식(ATM + MeSH explosion + tiab 동의어 + 유사 논문)으로 다양화하고, 결정론 MCP 계층이 전수 수집한 뒤 복합키(PMID → DOI → 정규화 title)로 중복 제거한다. 레코드를 버리지 않는다.
- **NCBI 전용 범위** — 단일 호스트(`eutils.ncbi.nlm.nih.gov`), 단일 db 계열(pubmed · pmc · mesh). Europe PMC / Crossref / Scholar는 형제 플러그인("한 API = 한 plugin").
- **하드 규칙은 코드가 강제** — 10,000 UID 상한 → 날짜 segmentation, EFetch GET 414 → auto-POST, rate limit(키 없음 3/s · 키 있음 10/s), History WebEnv ~1시간 만료 → PMID 체크섬, `retmax` 항상 명시.
- **재현 가능** — 모든 검색은 `SearchManifest`(검색식·번역·카운트·fetched PMID 체크섬)를 기록해 재현·논문 방법론 인용에 쓴다.

## 스킬

| 스킬       | 역할                                                                        |
| ---------- | --------------------------------------------------------------------------- |
| `search`   | 메인 오케스트레이터(Dispatcher): intent → 다중 역할 union → 재랭킹 → 레코드 |
| `query`    | 자연어 → PubMed 검색식만(검색 X)                                            |
| `download` | PMID/PMCID → OA 전문(PDF/XML/TAR) + 비OA 링크                               |
| `setup`    | web UI 설정(`tool` · `email` · `api_key`) + reachability                    |

## MCP 도구

`paper-search`(+ async `paper-search-start`/`_status`/`_results`) · `mesh-lookup` · `fetch-fulltext` · `setup` · `auth-check`.

## 설정

`setup` 스킬(또는 `auth-check`)을 실행하면 로컬 브라우저 폼이 NCBI `tool` / `email`(필수)과 선택적 `api_key`를 받는다. API key는 `credentials.json`(0o600)에만 저장되며 채팅·로그에 **절대** 노출되지 않는다.

## 빌드

```bash
yarn entrez build       # clean → version:sync → tsc → MCP 서버 번들
yarn entrez test:run    # 유닛 + e2e(fixture)
yarn entrez typecheck
```

설계 정본은 [`.metadata/entrez/`](../../.metadata/entrez/), 구현 계획은 [PLAN.md](./PLAN.md).
