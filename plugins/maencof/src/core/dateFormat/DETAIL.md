# dateFormat — Contract

## Requirements

- 순수 함수만 둔다. I/O 도 모듈 상태도 없다.
- 포맷은 로컬 시간대 기준이다 — 활동 로그와 dailynote 가 사용자가 보는 날짜와 같아야 하기 때문이다. UTC 로 바꾸면 자정 근처 기록이 하루 밀린다.
- 날짜 문자열은 `YYYY-MM-DD`, 시각은 `HH:MM`. 이 두 형태가 파일명·로그 라인의 계약이라 바꾸면 기존 기록과 어긋난다.

## API Contracts

- `formatDate(date)` — 로컬 기준 `YYYY-MM-DD`.
- `formatTime(date)` — 로컬 기준 `HH:MM`.
- `isDateInWindow(date, since?, until?)` — `YYYY-MM-DD` 문자열이 `[since, until]` 에 드는지. 양 끝 포함이고, 빈 bound 는 그 방향 무제한이다. `Date` 파싱 없이 사전식 비교로 판정한다 — 이 포맷에서는 사전식 순서가 시간순이다.

## Acceptance Criteria

### AC-local-timezone — 로컬 시간대

- 포맷 결과가 로컬 시간대 기준이다.

### AC-pure-format — 순수성

- 같은 입력에 같은 출력을 내고 파일시스템·모듈 상태를 읽지 않는다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. 훅이 날짜 포맷을 자체 구현하면 파일명 규약이 두 곳에서 갈라지므로 같은 함수를 직접 쓴다.

## Last Updated

2026-07-30 — 로컬 시간대·포맷 계약과 훅 직접 import 면책을 문서화했다.
