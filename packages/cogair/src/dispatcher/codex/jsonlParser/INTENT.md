## Purpose

codex-cli `codex exec` 의 JSONL stdout 을 라인 단위로 파싱해
`{ threadId, response, resolvedModel }` 을 추출. 알 수 없는 이벤트 shape 는 silently skip.

## Structure

| Path                      | Role                                                           |
| ------------------------- | -------------------------------------------------------------- |
| `parseCodexStream.ts`     | 메인 — 라인 split, JSON parse, 이벤트 종류별 분기              |
| `utils/findThreadId.ts`   | `thread.started` / `session_id` 변종 모두 허용해 threadId 추출 |
| `utils/readObject.ts`     | 안전한 nested object 필드 access                               |
| `utils/readString.ts`     | 안전한 string 필드 access                                      |
| `utils/isObject.ts`       | `unknown → Record` type guard                                  |
| `constants/threadKeys.ts` | 인식 가능한 thread 키 목록                                     |
| `index.ts`                | `parseCodexStream` 배럴                                        |

## Conventions

- 알 수 없는 shape 는 silently skip — 파싱 중단 금지
- 최종 응답 우선순위: 마지막 `agent.message` / `agent.complete` / `item.completed(agent_message)` 텍스트
- threadId 는 첫 발견 값 고정 — 이후 라인에서 변경 금지
- JSON parse 실패 라인은 skip, 에러 전파 없음
- 모델 문자열은 `inner.model` → `parsed.model` 순으로 탐색

## Boundaries

### Always do

- threadId 첫 캡처 후 덮어쓰기 금지 (첫 발견 우선)
- 파싱 실패 시 partial result `{ threadId, resolvedModel, response }` 반환

### Ask first

- codex 신규 이벤트 shape 추가 지원 (threadKeys 변경 포함)
- `agent.*` 이벤트 간 우선순위 변경

### Never do

- throw — 파싱 실패는 항상 partial result 반환
- 미완성 라인 버퍼링 없이 처리 (입력은 완전한 stdout 문자열)
- 외부 의존성 import (`../../../types` 외 패키지 금지)

## Dependencies

- `../../../types` (`DispatchResult` 참조용 타입)
- 외부 npm 의존성 없음 — 순수 string / JSON 처리
