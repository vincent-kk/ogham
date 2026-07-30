# jsonlParser — Contract

## Requirements

- `codex exec` 의 JSONL stdout 을 라인 단위로 파싱해 `{ threadId, response, resolvedModel, errorMessage }` 를 추출한다.
- **알 수 없는 이벤트 shape 는 조용히 건너뛴다.** CLI 가 새 이벤트를 추가해도 파싱이 무너지지 않아야 한다.
- 순수 함수다 — 프로세스를 띄우지 않고 문자열만 다룬다.

## API Contracts

- JSONL 파싱 — 라인 스트림에서 thread UUID, 최종 agent 메시지, 해석된 모델명, 오류 메시지를 뽑는다.

## Acceptance Criteria

### AC-unknown-event-skip — 미지 이벤트 내성

- 알려지지 않은 이벤트 타입이 섞여도 파싱이 실패하지 않고 알려진 필드를 정상 추출한다.
- 깨진 JSON 라인 하나가 전체 파싱을 중단시키지 않는다.

### AC-final-message — 최종 메시지 추출

- 여러 agent 메시지 중 최종 메시지가 `response` 로 선택된다.

## Last Updated

2026-07-30 — JSONL 파서의 내성 계약을 문서화했다.
