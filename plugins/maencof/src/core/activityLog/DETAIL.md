# activityLog — Contract

## Requirements

- 기록은 append-only 다. 기존 라인을 수정하거나 파일을 덮어쓰지 않는다 — 활동 로그는 사후 진단 근거이므로 재작성되면 근거가 사라진다.
- 한 줄이 이벤트 하나(NDJSON)다. 손상된 라인은 건너뛰고 나머지를 반환한다 — 한 줄의 파손이 그날 기록 전체를 버리게 하지 않는다.
- 날짜 경계는 파일 경계다. 경로는 `activity/events/YYYY-MM-DD.jsonl`.
- 세션 수명주기(open/close)는 기록하지 않는다. 그것은 `sessionStore` 의 계약이다.

## API Contracts

일자별 로그 부재와 손상 라인은 나머지 기록의 사용을 막지 않는다. 세션 open/close 기록은 sessionStore가 소유한다.

## Acceptance Criteria

### AC-append-only — 덧붙이기 전용

- append 가 기존 라인을 보존한다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. PostToolUse 훅이 기록 포맷을 자체 구현하는 대신 같은 함수를 직접 쓰는 편이 NDJSON 레이아웃을 한 곳에 묶어 둔다.

## Last Updated

append-only 보존·손상 라인 처리·세션 기록과의 소유권이 바뀔 때 갱신한다.
