# activityLog — Contract

## Requirements

- 기록은 append-only 다. 기존 라인을 수정하거나 파일을 덮어쓰지 않는다 — 활동 로그는 사후 진단 근거이므로 재작성되면 근거가 사라진다.
- 한 줄이 이벤트 하나(NDJSON)다. 손상된 라인은 건너뛰고 나머지를 반환한다 — 한 줄의 파손이 그날 기록 전체를 버리게 하지 않는다.
- 날짜 경계는 파일 경계다. 경로는 `activity/events/YYYY-MM-DD.jsonl`.
- 세션 수명주기(open/close)는 기록하지 않는다. 그것은 `sessionStore` 의 계약이다.

## API Contracts

- `getActivityEventsDir(cwd)` · `getActivityEventPath(cwd, date)` — 경로 파생. 파일시스템을 건드리지 않는다.
- `appendActivityEvent(cwd, entry)` — 한 줄 append. 디렉터리가 없으면 만든다.
- `readActivityEvents(cwd, date)` — 해당 일자 이벤트 배열. 파일 부재는 빈 배열, 파싱 실패 라인은 skip.
- `buildToolDescription(toolName, input)` — 도구 호출을 사람이 읽는 한 줄 설명으로. 순수 변환.

## Acceptance Criteria

### AC-append-only — 덧붙이기 전용

- append 가 기존 라인을 보존한다.

### AC-corrupt-line-skip — 손상 라인 건너뛰기

- 파싱 불가 라인이 섞여 있어도 나머지 이벤트가 반환된다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. PostToolUse 훅이 기록 포맷을 자체 구현하는 대신 같은 함수를 직접 쓰는 편이 NDJSON 레이아웃을 한 곳에 묶어 둔다.

## Last Updated

2026-07-30 — append-only·손상 내성 계약과 훅 직접 import 면책을 문서화했다.
