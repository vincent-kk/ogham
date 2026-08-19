# contextAssembler — Contract

## Requirements

- SA 결과(`ActivationResult[]`)를 AI 에이전트용 markdown 컨텍스트 블록으로 조립한다. 그래프 데이터를 수정하지 않는다.
- `assembleContext` 는 후보를 `ContextItem` 으로 변환(`toContextItems`)한 뒤 토큰 예산 안에서 점수순으로 선택(`selectItemsWithinBudget`)하고 markdown 을 만든다(`buildMarkdown`→`itemToMarkdown`). 항목 직렬화는 참조 라인(제목·경로·레이어·점수·관계·태그)만 담는다 — 본문 포함은 이 모듈의 몫이 아니라 호출자(kgContext 의 include_full 스니펫)의 몫이다.
- 클러스터 collapse 표기: 후보의 `clusterKey`/`collapsedCount` 는 `ContextItem` 으로 전파되고, `itemToMarkdown` 은 `collapsedCount` 가 있는 항목의 헤더 라인에 `(+N collapsed · cluster: <key>)` 를 덧붙인다 — 호출자가 markdown 만 보고도 `kg_search { cluster }` 열기 질의를 만들 수 있어야 한다.
- `estimateTokens` 는 단어 수 × 1.5 올림의 근사치다. 예산 선택과 kgContext 의 스니펫 계상이 같은 추정기를 쓴다 — 두 곳이 다른 자로 재면 예산 계약이 무의미해진다.
- `extractBestSnippet` 은 쿼리 토큰 매칭 부근의 발췌를 돌려준다. `maxLength`(기본 300자, 절단 표식 포함)를 넘는 단락은 문장→어절 경계 순으로 자르고 ` …` 표식을 붙인다.
- `ContextAssembler` 클래스는 기본 옵션을 보관하는 `assembleContext` 래퍼다.

## API Contracts

- barrel `index.ts` — `assembleContext(results, graph, options?)` · `extractBestSnippet(content, queryTerms)` · `estimateTokens(text)` · `ContextAssembler` · 타입(`ContextItem`/`AssembleOptions`/`AssembledContext`).
- `AssembleOptions` — `{ tokenBudget?: number }`(기본 2000).
- `AssembledContext` — `{ markdown, items, estimatedTokens, truncatedCount }`. `estimatedTokens` 는 선택 합계, `truncatedCount` 는 예산 초과로 제외된 항목 수.

## Acceptance Criteria

### AC-budget-selection — 예산 내 선택

- 선택 항목의 `itemToMarkdown` 토큰 합계(헤더 포함)가 `tokenBudget` 을 넘지 않고, 제외 수가 `truncatedCount` 로 보고된다.

### AC-reference-lines-only — 참조 라인 직렬화

- `itemToMarkdown` 출력은 제목·경로·레이어·점수·관계·태그 라인만 담고 본문 발췌를 포함하지 않는다.

### AC-shared-estimator — 추정기 단일화

- 예산 선택과 외부 소비자(kgContext)가 같은 `estimateTokens` 를 barrel 로 공유한다.

## Last Updated

2026-08-05 — 참조-라인 조립 계약과 estimateTokens 공개를 문서화했다 (cross-review FIX-016). 2026-08-05 — extractBestSnippet 경계 절단·`…` 표식 계약을 추가하고 기본 상한 표기를 코드(300자)와 일치시켰다.
