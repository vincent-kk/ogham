# entrez — 스킬

**원칙**: 스킬 = 노출되는 **라우팅 인터페이스**(`SKILL.md` description이 상시 컨텍스트 점유). "모듈 입도 ≠ 스킬 입도" — 소스 모듈은 잘게 쪼개도 노출은 **4개**로 최소화하고, 검색식 방법론·E-utilities 제약은 lazy `references/`·`_shared/`로 격리. 스킬은 마크다운 only(소스코드 없음) — filid/imbas 패턴.

## SKILL.md frontmatter (filid/imbas 형식)

```yaml
---
name: <kebab-case> # 접두 없음 (plugin namespace 자동)
user_invocable: true
description: '[entrez:<skill>] <한 줄 목적>. Trigger: "<구1>", "<구2>"'
argument-hint: "[--auto] [--db pubmed] [--date 2020:2026] ..."
version: "1.0.0"
complexity: simple|moderate|complex # complex → Dispatcher anti-yield preamble
plugin: entrez
---
```

## 노출 스킬 4

| 스킬         | complexity | 역할                                                                                          | 파이프라인  | 호출 agent                      | MCP                       |
| ------------ | ---------- | --------------------------------------------------------------------------------------------- | ----------- | ------------------------------- | ------------------------- |
| **search**   | complex    | 메인 오케스트레이터(Dispatcher): intent 분류 → `QueryRole` union → 재랭킹 → 레코드(메타+초록) | ①②③         | paper-search-expert (두 모드)   | paper-search, mesh-lookup |
| **query**    | moderate   | 자연어 → PubMed 검색식만(검색 X)                                                              | ① 만        | paper-search-expert (생성 모드) | mesh-lookup               |
| **download** | simple     | PMID/PMCID/DOI → OA PDF + 비OA 링크                                                           | search 후속 | —                               | fetch-fulltext            |
| **setup**    | simple     | web UI 설정(api_key·tool·email) + reachability                                                | —           | —                               | setup, auth-check         |

- `QUERY_ONLY`(검색식만)·`DOWNLOAD`는 `query`·`download` 스킬을 **직접 호출**(최소 경로). `FULL_SEARCH`는 `search`가 전체 오케스트레이션([dispatcher.md](./dispatcher.md)).
- `--auto` 플래그는 `search`가 받아 모드 전환(Dispatcher 실행 플래그).

## search (오케스트레이터 = Dispatcher)

```
skills/search/
├── SKILL.md                  # Dispatcher anti-yield preamble + intent 분류 + 파이프라인 진입
└── references/
    ├── state-machine.md      # 상태·전이표·SEARCH 내부 단계·iteration guard (→ dispatcher.md)
    ├── intent.md             # FULL_SEARCH/QUERY_ONLY/DOWNLOAD/NEEDS_CLARIFICATION 분류 휴리스틱
    └── modes.md              # interactive(기본) / --auto
```

- `search`만 `complexity: complex` → `SKILL.md` 상단에 Dispatcher anti-yield preamble(상태머신 무인 진행).
- progressive disclosure: `SKILL.md`는 얇게, 실행 시 `references/*`와 `_shared/{필요한 것}`만 로드.

## \_shared/ (lazy, plugin 공통)

```
skills/_shared/
├── mcp-tools.md       # 5종 도구 I/O 계약 요약 (SSoT는 → mcp-tools.md)
├── eutils.md          # E-utilities db·필드 태그·🔴 10k cap·POST 전환·rate·History 만료 (lazy)
├── query-strategy.md  # 생성 모드 방법론 SSoT (QueryRole·ESpell·recall 게이트) — agent가 로드
└── rerank.md          # 재랭킹 모드 방법론 SSoT (pre-score 후 정렬만) — agent가 로드
```

- `eutils.md`는 검색식 lint·`SEARCH` 내부 단계 디버깅 시에만 로드(상시 컨텍스트 점유 회피).
- **중복 방지 SSoT**: I/O 계약 단독 소유 = MCP + `_shared/mcp-tools.md`, E-utilities db·필드·제약 단독 소유 = `_shared/eutils.md`, 검색식 방법론·재랭킹 기준 단독 소유 = `_shared/{query-strategy,rerank}.md`(agent가 로드 — [agents.md](./agents.md)), 오케스트레이션 절차 단독 소유 = `search/SKILL.md`.

## query / download / setup (thin)

- **query**: `paper-search-expert` 생성 모드만 호출해 `QueryRole` 검색식 집합 + PubMed `QueryTranslation` 반환. `paper-search` 미실행(① 만). `mesh-lookup`으로 MeSH descriptor/SCR/entry 매핑 표시.
- **download**: `fetch-fulltext` 래퍼. `downloaded[]`(OA PDF/XML/TAR + sha256·license·oaStatus) 저장, `unavailable[]`(비OA)는 DOI·publisher 링크로 리포트. "OA면 저장, 비OA 링크 리포트" — 라이선스·copyright 표시(PMCID≠재배포 가능, [spec.md](./spec.md)).
- **setup**: `setup` MCP web UI(api_key→`credentials.json` 0o600, 나머지→`config.json`) + `auth-check`(EInfo reachability·rate 표시). 상세 [setup.md](./setup.md).

## mesh 미노출 · export 흡수

- **mesh 미노출**: MeSH descriptor/SCR/entry term 매핑은 `mesh-lookup` MCP로 충분. agent가 검색식 생성 시 직접 호출하므로 별도 스킬로 노출하면 `SKILL.md` description이 상시 컨텍스트만 차지하고 라우팅 가치가 없음("모듈 입도 ≠ 스킬 입도").
- **export 미노출**: 결과 내보내기는 별도 스킬 X — `search` 출력(레코드 메타+초록)이 흡수. 출력 포맷·`date_tag` 파일화는 `search`의 `modes.md`(--auto)가 담당.

## progressive disclosure (lazy 로딩)

- 노출 비용 = description × 상시 로드. 4개만 노출, 나머지는 호출 시 lazy.
- 로드 순서: `SKILL.md`(얇음) → 분기에 따라 `references/{state-machine|intent|modes}.md` → 도구 호출 직전 `_shared/{mcp-tools|eutils}.md`.
- agent 리소스(`_shared/query-strategy.md`·`_shared/rerank.md`)는 노출 스킬이 아니라 `paper-search-expert`가 모드 진입 시 로드([agents.md](./agents.md)). `agents/`는 서브디렉토리 불가라 `_shared`에 둔다.

## Agent ↔ Skill ↔ MCP 경계

| 레이어                                                             | 책임                                                                 | 가변성           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------- |
| **Agent** (paper-search-expert)                                    | 검색식 다양화(`QueryRole` 선택·`breadth`·rationale)·재랭킹 점수·근거 | 가변(추론 WHAT)  |
| **Skill** (search + query·download·setup)                          | 오케스트레이션 절차·intent 분기·출력 포맷·모드                       | 절차(HOW)        |
| **MCP** (paper-search·mesh-lookup·fetch-fulltext·setup·auth-check) | union·dedup 복합키·10k cap·POST·rate·OA 판별                         | 불변(결정론 I/O) |

원칙: **agent=추론(WHAT) · skill=절차(HOW) · MCP=계약(I/O)**. 코드 규칙(10k cap·POST·rate·lint)은 LLM이 아니라 deterministic service가 소유.
