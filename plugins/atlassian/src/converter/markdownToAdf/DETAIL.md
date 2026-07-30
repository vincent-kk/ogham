# markdownToAdf — Contract

## Requirements

- Markdown 을 ADF JSON 문서로 조립하는 순수 함수 모듈이다.
- 블록·인라인 파싱은 공용 organ(`../markdownParsing/`)을 쓴다 — 파서를 여기서 다시 만들지 않는다.
- 출력은 항상 유효한 ADF `doc` 구조다. 빈 입력은 빈 paragraph 를 담은 유효한 `doc` 을 낸다.

## API Contracts

- `markdownToAdf(markdown: string): AdfNode` — ADF `doc` 노드.
- `operations/renderBlocks` — `MarkdownBlock[]` → ADF 블록 노드(organ).
- `operations/renderInline` — 인라인 토큰 → 마크가 적용된 ADF text 노드(organ).

## Acceptance Criteria

### AC-doc-structure — 문서 구조

- 결과가 유효한 `doc` 구조를 갖는다.
- 빈 입력도 유효한 빈 문서를 낸다.

### AC-block-coverage — 블록 커버리지

- heading·언어가 붙은 code block·bulletList·orderedList·blockquote·horizontal rule·table 이 각각 대응 ADF 노드로 변환된다.

### AC-inline-marks — 인라인 마크

- bold·italic·code 가 ADF 마크로 변환된다.

## Last Updated

2026-07-30 — Markdown → ADF 변환 계약을 문서화했다.
