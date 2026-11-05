## Purpose

codex-cli `codex exec` 의 JSONL stdout 을 라인 단위로 파싱해 `{ threadId, response, resolvedModel, errorMessage }` 를 추출. 알 수 없는 이벤트 shape 는 silently skip.

## Conventions

- 알 수 없는 shape 는 silently skip — 파싱 중단 금지
- 최종 응답 우선순위: 마지막 `agent.message` / `agent.complete` / `item.completed(agent_message)` 텍스트
- `errorMessage` 는 마지막 `error.message` / `turn.failed.error.message` — codex 는 실패 사유를 여기에만 싣고 stderr 에는 남기지 않으므로 `errorMap` 이 이 값으로 분류·전달한다
- threadId 는 첫 발견 값 고정 — 이후 라인에서 변경 금지
- JSON parse 실패 라인은 skip, 에러 전파 없음

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
