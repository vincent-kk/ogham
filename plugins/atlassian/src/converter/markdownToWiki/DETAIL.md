# markdownToWiki — Contract

## Requirements

- Wiki Markup 의 특수문자는 리터럴로 남아야 할 때 이스케이프한다 — 빼먹으면 사용자 텍스트가 마크업으로 해석된다. 대상은 text·code·strong·em·strike 토큰의 `[]{}|*_-+^~!` 이며 `\` 를 앞에 붙인다. 이미 `\X` 로 이스케이프된 것은 통과시킨다.
- **link·image 본문은 이스케이프하지 않는다.** `\` 가 링크 파싱을 깨거나 alt 텍스트에 그대로 노출된다.
- 빈 입력은 빈 문자열이다. 알 수 없는 토큰은 throw 하지 않고 raw text 로 폴백한다.
- 블록·인라인 파싱은 공용 organ(`../markdownParsing/`)을 쓴다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-wiki-degradation — 입력 내성

- 빈 입력은 빈 문자열을 낸다.
- 알 수 없는 토큰은 raw text 로 폴백하고 예외를 던지지 않는다.

## Last Updated

Wiki 리터럴 이스케이프와 링크·이미지 예외 정책이 바뀔 때 갱신한다.
