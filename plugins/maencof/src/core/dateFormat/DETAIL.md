# dateFormat — Contract

## Requirements

- 순수 함수만 둔다. I/O 도 모듈 상태도 없다.
- 포맷은 로컬 시간대 기준이다 — 활동 로그와 dailynote 가 사용자가 보는 날짜와 같아야 하기 때문이다. UTC 로 바꾸면 자정 근처 기록이 하루 밀린다.
- 날짜 문자열은 `YYYY-MM-DD`, 시각은 `HH:MM`. 이 두 형태가 파일명·로그 라인의 계약이라 바꾸면 기존 기록과 어긋난다.

## API Contracts

파일명과 로그가 같은 날짜를 가리키도록 로컬 시간대와 포맷을 함께 유지한다. 날짜 구간 비교는 이 고정 포맷의 사전식 순서가 시간순이라는 전제를 사용한다.

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

로컬 날짜 포맷·기간 비교 전제·훅 소비 경계가 바뀔 때 갱신한다.
