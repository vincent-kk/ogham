## Purpose

실행 중인 provider CLI 를 강제 종료하는 진입점. `dispatcher` 원장이 들고 있는 in-flight 실행을 필터로 골라 abort 시키고, 무엇을 죽였는지 보고. 취소 신호가 닿지 않는 경우(호스트가 `notifications/cancelled` 를 보내지 않거나, 위임을 띄운 쪽이 이미 사라진 경우)의 유일한 수동 탈출구.

## Structure

| Path                  | Role                                                     |
| --------------------- | -------------------------------------------------------- |
| `stopConversation.ts` | `handleStopConversation` — 필터 → `stopRuns` → 결과 요약 |
| `index.ts`            | barrel                                                   |

## Conventions

- 입력 키 `snake_case`, 둘 다 optional: `session_id`(특정 세션), `provider`(해당 provider). 함께 주면 AND, 둘 다 생략하면 이 서버 프로세스의 실행 전부
- 응답은 `ConversationResponse` 가 아니라 자체 shape `{ stopped, count, message }` — 대화가 아니라 조작 결과를 보고한다 (`openSettings` 선례)
- `count: 0` 은 실패가 아니다. 이미 끝났거나 다른 세션이 띄운 실행이라는 뜻이며 `message` 가 그렇게 말한다
- 원장은 **이 MCP 서버 프로세스(= 이 Claude 세션)** 가 띄운 실행만 담는다. 다른 세션·다른 프로젝트의 CLI 는 보이지 않고 죽일 수도 없다
- 종료는 프로세스 그룹 SIGKILL — CLI 가 만든 자식까지 함께 정리되고, 진행 중 작업과 부분 출력은 회수되지 않는다

## Boundaries

### Always do

- 중단은 `dispatcher` 엔트리포인트의 `stopRuns` 경유 (원장 organ 직접 import 금지)
- 죽인 실행마다 `session_id`·`provider`·`elapsed_ms` 를 그대로 보고

### Ask first

- 입력 스키마에 새 필터 키 추가
- 다른 세션·다른 프로세스의 실행까지 사정권에 넣는 확장 (현재는 의도적으로 프로세스 국한)

### Never do

- 세션 메타·카운터 변경 — 이 도구는 프로세스만 건드린다
- 중단 대상이 없다고 throw — 항상 `count: 0` envelope 로 정규화

## Dependencies

- `../../../dispatcher` — `stopRuns`, `StoppedRun` (실행 원장 조작)
- `../../../types` — `Provider`
