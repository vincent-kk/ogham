# shared — Contract

## Requirements

- 도구 응답은 `toolResult` 로 compact JSON 직렬화한다. 디버그 시에만 `CENNAD_PRETTY_JSON=1` 로 확장한다.
- `wrapHandler` 는 **wrap-only** 다 — 비정상 throw 를 흡수할 뿐, 실패 envelope 를 스스로 만들지 않는다. 실패 표현은 핸들러가 `ConversationResponse` 로 돌려준다.
- 모든 도구가 같은 envelope 형태를 쓴다.
- 오래 걸리는 호출은 주기적 progress notification 으로 호스트의 idle 판정을 피한다. 호스트는 응답도 progress 도 없이 idle 한도를 넘긴 호출을 중단시키는데, provider CLI 는 tier 에 따라 몇 시간을 돌 수 있고 그동안 이 서버는 아무것도 보내지 않는다. 호스트가 `progressToken` 을 주지 않으면 progress 를 받을 의사가 없다는 뜻이므로 아무것도 보내지 않는다.

## API Contracts

- `toolResult(...)` — compact JSON 직렬화.
- `toolError(...)` — 던져진 값을 오류 결과로 변환.
- `wrapHandler(...)` — throw 흡수 래퍼 + 요청 취소 신호 전달 + 하트비트 수명 관리.
- `startProgressHeartbeat(...)` — 요청 컨텍스트를 받아 주기 notification 을 시작하고 정지 함수를 돌려준다. barrel 미노출 — 소비자는 `wrapHandler` 하나이며, 도구 핸들러가 직접 호출할 표면이 아니다.

## Acceptance Criteria

### AC-envelope-uniformity — 봉투 통일

- 네 도구의 응답이 같은 형태로 직렬화된다.

### AC-wrap-only — 래퍼 책임 한정

- `wrapHandler` 가 성공 응답의 내용을 바꾸지 않는다.

### AC-idle-heartbeat — idle 방지 하트비트

- `progressToken` 과 `sendNotification` 이 모두 있을 때만 `notifications/progress` 를 간격마다 보낸다.
- 하트비트 전송이 실패해도 도구 실행은 계속되고 이후 하트비트도 멈추지 않는다.
- 핸들러가 성공하든 throw 하든 하트비트는 멈춘다.

## History

- 2026-08-04 — progress 하트비트를 도입했다. stdio 서버의 호스트 idle 한도(기본 30 분)가 cennad 의 tier 별 hard cap(apex 6 시간)보다 짧아, 긴 위임이 답을 내기 전에 호스트에서 잘렸다. 하트비트는 `wrapHandler` 가 소유한다 — 모든 도구가 그 래퍼를 지나므로 도구마다 되풀이할 필요가 없다.

## Last Updated

2026-08-04 — progress 하트비트 계약을 더했다.
