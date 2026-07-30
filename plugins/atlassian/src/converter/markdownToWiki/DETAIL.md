# markdownToWiki — Contract

## Requirements

- Markdown 을 Jira Wiki Markup 으로 바꾸는 순수 함수 모듈이다. Server/DC v2 REST API 의 본문 포맷이다.
- Wiki Markup 의 특수문자는 리터럴로 남아야 할 때 이스케이프한다 — 빼먹으면 사용자 텍스트가 마크업으로 해석된다. 대상은 text·code·strong·em·strike 토큰의 `[]{}|*_-+^~!` 이며 `\` 를 앞에 붙인다. 이미 `\X` 로 이스케이프된 것은 통과시킨다.
- **link·image 본문은 이스케이프하지 않는다.** `\` 가 링크 파싱을 깨거나 alt 텍스트에 그대로 노출된다.
- 빈 입력은 빈 문자열이다. 알 수 없는 토큰은 throw 하지 않고 raw text 로 폴백한다.
- 블록·인라인 파싱은 공용 organ(`../markdownParsing/`)을 쓴다.

## API Contracts

- `markdownToWiki(markdown: string): string`
- `operations/renderBlocks` — 블록 → Wiki 블록 문자열(organ).
- `operations/renderInline` — 인라인 토큰 → Wiki 인라인 마크업 + 리터럴 특수문자 이스케이프(organ).

## Acceptance Criteria

### AC-wiki-block-coverage — 블록 커버리지

- heading·code block·목록·blockquote·rule·table 이 각각 Wiki 구문으로 변환된다.

### AC-wiki-escaping — 특수문자 이스케이프

- text·code·strong·em·strike 토큰의 `[]{}|*_-+^~!` 가 `\` 로 이스케이프된다.
- 이미 이스케이프된 `\X` 는 이중 이스케이프되지 않는다.
- link·image 본문은 이스케이프되지 않아 링크가 깨지거나 alt 에 `\` 가 노출되지 않는다.

### AC-wiki-degradation — 입력 내성

- 빈 입력은 빈 문자열을 낸다.
- 알 수 없는 토큰은 raw text 로 폴백하고 예외를 던지지 않는다.

## Last Updated

2026-07-30 — Markdown → Wiki Markup 변환 계약을 문서화했다.
