# tools — Contract

## Requirements

- 도구별 계약과 렌더링 규칙은 해당 자식 fractal이 소유한다. 상위 문서가 도구 이름·입출력 목록을 복제하지 않는다.
- 배럴은 이름 지정 재노출만 쓴다. wildcard는 조용히 표면을 넓히고 소비자가 의존하는 계약을 감춘다.
- 자식 도구의 추가·제거는 공개 계약 변경이며 자식 경계와 상위 재노출을 함께 바꾼다.

## API Contracts

도구 이름의 정본은 McpToolName이고 배럴은 라이브러리 심볼을 공개한다. 이름 목록과 값·타입 수는 소스에서 읽는다. 소비자가 없는 재노출과 빠진 재노출이 생기지 않도록 표면을 맞춘다.

## Acceptance Criteria

### AC-named-reexports-only — 이름 지정 재노출 한정

- `index.ts` 에 `export *` 가 없어 공개 표면이 어댑터로 열거된다(`entry-point-surface` 가 `exact`).

### AC-surface-matches-consumer — 소비자 표면 일치

- 배럴이 재노출하는 이름의 집합이 소비자 `mcp/index.ts` 가 가져가는 이름의 집합과 일치한다 — 쓰이지 않는 재노출도, 빠진 재노출도 없다.

## Last Updated

도구별 소유권과 배럴 공개 정책이 바뀔 때 갱신한다.
