# adfToMarkdown — Contract

## Requirements

- ADF JSON 을 Markdown 으로 바꾸는 순수 함수 모듈이다. 블록·인라인·마크·표를 재귀 처리한다.
- 알 수 없는 노드 타입은 자식 콘텐츠로 폴백한다.
- `AdfNode` 타입은 `../types/` 에서 가져온다 — 이 모듈이 다시 정의하지 않는다.
- mention 은 표기가 여러 갈래다: `@` 접두가 없으면 붙이고, 있으면 보존하고, 텍스트가 없으면 `displayName` → `id` 순으로 폴백한다.
- 미디어는 이미지 자식이면 이미지 문법으로, 그 밖이면 `[media]` 로 떨어진다.

## API Contracts

- `adfToMarkdown(node): string | null` — doc·배열·단일 노드를 모두 받는다. `null`/`undefined` 입력은 `null`, 문자열 입력은 그대로 돌려준다.
- `operations/convertBlock` · `convertInline` · `applyMarks` · `convertTable` — 각 층위 변환(organ).

## Acceptance Criteria

### AC-node-coverage — 노드 커버리지

- heading(1–6)·codeBlock·bulletList·orderedList·blockquote·rule·table·mention·emoji·status·inlineCard·hardBreak 가 각각 대응 Markdown 으로 변환된다.
- 표는 GFM 파이프 테이블로 렌더된다.

### AC-mark-application — 마크 적용

- bold·italic·code·strike·link 마크가 Markdown 구문으로 적용된다.

### AC-mention-fallback — mention 표기 폴백

- `@` 접두 유무에 따라 붙이거나 보존하고, 텍스트 부재 시 `displayName` → `id` 순으로 대체한다.

### AC-media-fallback — 미디어 폴백

- 이미지가 아닌 미디어와 attrs 없는 미디어가 `[media]` 로 떨어진다.

### AC-passthrough — 비변환 입력

- `null`/`undefined` 는 `null`, 문자열은 입력 그대로 반환된다.

## Last Updated

2026-07-30 — ADF → Markdown 변환 계약을 문서화했다.
