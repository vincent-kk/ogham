# entrez — 에이전트

1종. `agents/paper-search-expert.md`. `search`(Dispatcher 겸)가 `Task(subagent_type: "entrez:paper-search-expert")`로 호출. 에이전트는 **MCP를 직접 호출**한다(r-statistics `r-expert`가 `run_r`를 부르듯, entrez 에이전트는 `mesh_lookup`·`paper_search`를 직접 부른다). 상태 전이는 Dispatcher가 담당하고, 에이전트는 추론 산출물(검색식 또는 랭킹)만 반환한다.

핵심 원칙: **물리 1 에이전트 + 내부 2모드 논리 분리**. 한 에이전트가 검색 생성(WHAT)과 재랭킹(RANK)을 모두 맡되, 모드별로 prompt·출력 schema·평가기준을 분리한다. 검색식 방법론과 재랭킹 기준의 SSoT는 에이전트가 아니라 `skills/_shared/{query-strategy,rerank}.md`이며(중복 방지 — [spec.md](./spec.md) SSoT 표; `agents/`는 서브디렉토리 불가라 `_shared`에 둔다), 도구 I/O 계약은 [mcp-tools.md](./mcp-tools.md)가 단독 소유한다.

## frontmatter 형식

```yaml
---
name: paper-search-expert
description: >
  NCBI E-utilities paper search reasoner. Two internal modes —
  generation (recall: topic decomposition + MeSH lookup -> multi-role
  PubMed query set) and rerank (precision: semantic scoring of
  pre-filtered candidates). Calls mesh_lookup / paper_search MCP tools
  directly; deterministic union/cap/POST handled inside paper_search.
model: sonnet
tools: [Read, mcp_mesh_lookup, mcp_paper_search]
maxTurns: 15
---
```

| 필드       | 값                                                                                   | 근거                                                                                                                                                                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`     | `paper-search-expert`                                                                | L4 정본 명칭.                                                                                                                                                                                                                                                                                                                                   |
| `model`    | `sonnet`                                                                             | 두 모드 모두 schema-구속 작업(생성=구조화 검색식 목록, 재랭킹=pre-score된 top-N 채점)이라 발산 추론 부담이 작다. recall 안전망은 LLM이 아니라 **구조적 장치**(mesh_lookup MCP·`QueryRole` 스펙트럼·ESpell·결정론 union)가 보장하므로, 고빈도·저지연 실행자인 `r-expert`(sonnet) 역할에 더 가깝다. opus는 비채택(비용·반복 지연 대비 이득 작음). |
| `tools`    | `Read`, `mcp_mesh_lookup`, `mcp_paper_search`(+ async `_start`/`_status`/`_results`) | `Read`=참조 문서(`skills/_shared/query-strategy.md`·`rerank.md`)·전달 컨텍스트 로드. `mesh_lookup`+`paper_search`(동기·대량 async 표면)만 — `fetch_fulltext`는 download 스킬 소관이라 미부여(검색·랭킹 책임 격리). `Bash`/`Grep`/`Glob` 미부여(파일시스템 작업 없음).                                                                           |
| `maxTurns` | `15`                                                                                 | recall 루프 상한과 정렬: `recallIter≤4` × (mesh_lookup + paper_search + union 점검) + 검색식 emit + 여유. `operationBudget`(maxRequests·maxRecords·maxWallMs)과 이중 가드. 재랭킹 모드는 보통 1~3턴으로 종료.                                                                                                                                   |

## 단일 에이전트 · 내부 2모드

Dispatcher가 hand-off의 `mode` 필드로 분기시킨다. 두 모드는 **같은 에이전트 정의를 공유**하되 서로 다른 system prompt 섹션·출력 schema·평가기준을 활성화한다.

| 모드                 | 지향      | 질문                               | 입력                       | 출력 schema                                   | reference(SSoT)                    |
| -------------------- | --------- | ---------------------------------- | -------------------------- | --------------------------------------------- | ---------------------------------- |
| **생성**(generation) | recall    | WHAT을 어떻게 빠짐없이 검색할까    | topic + meshHints          | `{queries[]{term, role, breadth, rationale}}` | `skills/_shared/query-strategy.md` |
| **재랭킹**(rerank)   | precision | 후보 중 무엇이 정보요구에 부합하나 | pre-score된 후보 records[] | `{ranked[]{pmid, score, reason}}`             | `skills/_shared/rerank.md`         |

## 생성 모드 (WHAT · recall)

목표는 **검색 누락 방지**다. 절차:

1. **주제 분해** — 자연어 요구를 개념 facet(PICO 등)으로 분해.
2. **`mcp_mesh_lookup`** — facet별 MeSH 매핑 조회 → `descriptorName`·`treeNumbers`·`entryTerms`·`scrMappings`. Descriptor/SCR/entry 구분을 검색식 설계에 반영.
3. **`QueryRole` 다중 검색식 생성** — 한 facet을 여러 역할로 동시 표현해 union recall을 확보:

   | `QueryRole`     | 형태                                     | `Breadth` | 목적                                    |
   | --------------- | ---------------------------------------- | --------- | --------------------------------------- |
   | `ATM_BROAD`     | untagged 핵심어                          | `BROAD`   | PubMed ATM(MeSH 자동매핑) 활용          |
   | `MESH_EXPLODED` | `Term[mh]`                               | `BROAD`   | explosion 기본(하위 트리 포함) recall   |
   | `MESH_NOEXP`    | `Term[mh:noexp]`                         | `NARROW`  | 좁은 검증용                             |
   | `TIAB_SYNONYM`  | `[tiab]` 동의어·철자변형·약어·미/영 철자 | `MEDIUM`  | 미색인 최신 논문 확보                   |
   | `ALL_FIELDS`    | broad fallback                           | `BROAD`   | 안전망                                  |
   | `SIMILAR`(옵션) | ELink Similar Articles, `seed_pmids[]`   | —         | known-item 확장(`ExpansionSource` 표시) |

4. **lint-clean 산출** — 따옴표·wildcard·field tag는 ATM/explosion을 꺼버리므로(recall 저하), 생성 검색식이 매핑을 끄지 않도록 작성한다. 결정론 `queryLint` 서비스가 괄호 짝·예약어·태그 오용을 사후 검증한다(검증은 코드 소관).
5. **`mcp_paper_search` 호출** — 생성한 `queries[]`를 넘기면 MCP가 10k cap·날짜 segmentation·EFetch POST·dedup union을 **내부에서 결정론적으로** 처리한다. 에이전트는 검색식만 책임지고 union 메커니즘은 보지 않는다.
6. **recall 게이트 점검·재생성** — 반환 `union`/`warnings`(ESpell spelling-warning, OOV, 빈약 결과)를 보고, 게이트 미충족 + budget 잔여 시 broad화(`Breadth` 상향·`role` 추가·ESpell 교정 반영)하여 재생성. 종료: `union 증가율<5%` or cap 초과 or budget 소진 or `recallIter` 한계.

출력(에이전트→Dispatcher):

```ts
interface GeneratedQuery {
  term: string; // PubMed 검색식 본문(데이터 — enum 아님)
  role: QueryRole; // ATM_BROAD | MESH_EXPLODED | MESH_NOEXP | TIAB_SYNONYM | ALL_FIELDS | SIMILAR
  breadth: Breadth; // BROAD | MEDIUM | NARROW
  rationale: string; // 이 검색식이 어떤 누락을 막는지
}
interface GenerationOutput {
  queries: GeneratedQuery[];
}
```

**평가기준(recall)**: facet 커버리지, role 스펙트럼 완전성(ATM+explosion+tiab+similar), 동의어·철자변형 폭, lint 무결, ATM/explosion 보존(매핑 끄는 따옴표·태그 없음).

## 재랭킹 모드 (RANK · precision)

전건 LLM 재랭킹은 비채택. **결정론 pre-score로 후보를 축소한 뒤 top-N만** 에이전트에 넘긴다(비용·타임아웃 회피).

1. 입력: 정보요구 + pre-score된 후보 `records[]`(`PaperRecord`: pmid·title·abstract·year·journal·mesh·`hit_by[]`·`query_role[]`).
2. 각 후보에 대해 정보요구와의 **의미 점수 + 근거**를 부여.
3. 산출:

```ts
interface RankedRecord {
  pmid: string; // primary key(절대 신규 생성·환각 금지)
  score: number; // 정보요구 부합도(0~1 등 reference 정의 척도)
  reason: string; // 점수 근거(짧고 검증 가능하게)
}
interface RerankOutput {
  ranked: RankedRecord[];
}
```

**평가기준(precision)**: 정보요구와의 의미 정합, 점수 캘리브레이션, 근거 타당성, **정렬만 수행(레코드 제거 금지)** — 재랭킹은 순서만 바꾸고 recall을 보존한다([README.md](./README.md) 데이터 흐름 ③ "정렬만"), 입력에 없는 pmid 출력 금지.

## 모드 분리 근거 (codex 절충)

| 안                                | 평가                                                                                                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 한 prompt에 생성+재랭킹 혼재      | self-bias(자기 생성 검색식의 결과를 후하게 평가)·평가기준 혼선·schema 혼재. **기각**.                                                                                                                 |
| 에이전트 2개 물리 분리            | self-bias는 제거되나 컨텍스트 단절·일관성 저하·관리 비용↑. **기각**.                                                                                                                                  |
| **물리 1 + 모드 논리 분리(채택)** | 일관성·컨텍스트 공유 유지 + 모드별 prompt·schema·평가기준 분리로 혼재 우려 해소. self-bias는 재랭킹 prompt가 pre-score된 후보만 보고 "검색식 출처"를 의식하지 않게 차단 + **"정렬만"** 규칙으로 완화. |

요지: 물리 1 에이전트 유지로 self-bias↓·일관성 확보, 모드 분리로 두 모델(codex·antigravity)이 제기한 혼재 우려를 동시에 해소한다.

## 호출 · 도구 사용

- **호출**: Dispatcher가 `Task(subagent_type: "entrez:paper-search-expert")`로 모드를 지정해 호출. 상태 전이는 Dispatcher가 소유([dispatcher.md](./dispatcher.md)).
- **MCP 직접 호출**: 에이전트가 `mcp_mesh_lookup`·`mcp_paper_search`를 직접 부른다. `paper_search` 내부의 결정론 단계(query_lint→count_probe→date_segment→fetch_ids→fetch_records(POST·batch)→partial_recovery)는 **코드 소관**이라 에이전트가 관여하지 않는다 — 에이전트는 `queries[]`를 주고 `union`을 받는다.
- **참조 로드**: `Read`로 `skills/_shared/query-strategy.md`(생성)·`skills/_shared/rerank.md`(재랭킹)를 로드해 방법론을 적용한다. 방법론 본문은 에이전트 정의가 아니라 reference가 SSoT. (`agents/`는 서브디렉토리 불가 — 로더가 `agents/*.md`를 전부 에이전트로 취급 — 이므로 참조는 `skills/_shared/`에 둔다.)

## hand-off 계약 (immutable · audit)

immutable·versioned. Dispatcher가 각 호출에 모드·상태·사전 결정(audit trail)·budget을 전달하고, 에이전트는 구조화된 델타(검색식 또는 랭킹)만 반환한다. 전 검색은 [SearchManifest](./architecture.md)에 기록되어 재현·디버깅에 쓰인다. 상세 [dispatcher.md](./dispatcher.md).

```ts
interface SearchHandoff {
  from: "dispatcher";
  to: "paper-search-expert";
  mode: "generation" | "rerank"; // 모드별 prompt·schema 선택
  state: PipelineState; // INTAKE | CLASSIFY | QUERY_GEN | SEARCH | RANK | COMPLETE | ...
  context: {
    intent: IntentType; // FULL_SEARCH | QUERY_ONLY | DOWNLOAD | NEEDS_CLARIFICATION
    topic?: string; // generation 입력
    meshHints?: MeshMapping[]; // 선행 mesh_lookup 결과(있으면)
    priorQueries?: GeneratedQuery[]; // 재생성(broaden) 시 audit
    candidates?: PaperRecord[]; // rerank 입력(pre-score된 top-N)
    operationBudget: {
      maxRequests: number;
      maxRecords: number;
      maxWallMs: number;
    };
    executionMode: ExecutionMode; // interactive | auto
  };
}
```

규약: 입력 컨텍스트는 immutable(에이전트가 사전 결정을 덮어쓰지 않음), 모든 호출·반환은 audit trail에 누적되어 SearchManifest로 재현 가능해야 한다.
