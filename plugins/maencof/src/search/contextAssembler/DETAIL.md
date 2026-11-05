# contextAssembler — Contract

## Requirements

- SA 결과(`ActivationResult[]`)를 AI 에이전트용 markdown 컨텍스트 블록으로 조립한다. 그래프 데이터를 수정하지 않는다.
- 본문 포함은 호출자(kgContext)의 몫이며 이 조립기는 참조 라인만 직렬화한다 — 본문 계상과 참조 예산을 섞지 않는다.
- 클러스터 collapse 표기: 후보의 `clusterKey`/`collapsedCount` 는 `ContextItem` 으로 전파되고, `itemToMarkdown` 은 `collapsedCount` 가 있는 항목의 헤더 라인에 `(+N collapsed · cluster: <key>)` 를 덧붙인다 — 호출자가 markdown 만 보고도 `kg_search { cluster }` 열기 질의를 만들 수 있어야 한다.
- `estimateTokens` 는 단어 수 × 1.5 올림의 근사치다. 예산 선택과 kgContext 의 스니펫 계상이 같은 추정기를 쓴다 — 두 곳이 다른 자로 재면 예산 계약이 무의미해진다.

## API Contracts

항목 직렬화는 본문이 아닌 참조 라인을 담는다. 클러스터 표시가 markdown에도 남아야 호출자가 펼치기 질의를 만들 수 있다. 토큰 추정은 근사이며 예산 선택과 외부 스니펫 계상은 같은 추정기를 사용한다.

## Acceptance Criteria

### AC-budget-selection — 예산 내 선택

- 선택 항목의 `itemToMarkdown` 토큰 합계(헤더 포함)가 `tokenBudget` 을 넘지 않고, 제외 수가 `truncatedCount` 로 보고된다.

### AC-reference-lines-only — 참조 라인 직렬화

- `itemToMarkdown` 출력은 제목·경로·레이어·점수·관계·태그 라인만 담고 본문 발췌를 포함하지 않는다.

### AC-shared-estimator — 추정기 단일화

- 예산 선택과 외부 소비자(kgContext)가 같은 `estimateTokens` 를 barrel 로 공유한다.

## Last Updated

참조 라인 소유권·공유 추정기·예산 계약이 바뀔 때 갱신한다.
