# cancelRJob — Contract

## Requirements

- 취소는 jobStore에 위임하며 직접 프로세스를 죽이지 않는다. 상태 전이와 실제 종료 신호의 소유권을 한 곳에 유지한다.
- 종료된 잡과 미등록 잡을 구분하며 반복 취소는 오류로 만들지 않는다.

## API Contracts

- 반복 취소는 상태 응답이며 재실행을 유발하지 않는다. 종료된 잡과 미등록 잡은 구분하여 클라이언트가 재시도 결과를 해석할 수 있게 한다.

## Acceptance Criteria

### AC-cancel-idempotence — 반복 취소 안전성

- 실행 중 잡 취소는 해당 잡의 `AbortController` 를 abort 한다.
- 종료된 잡 취소는 `already_finished`, 미등록 잡 취소는 `not_found` 로 답하며 둘 다 예외를 던지지 않는다.

## Last Updated

반복 취소·종료 신호·상태 응답 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
