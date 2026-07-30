# codex — Contract

## Requirements

- `codex exec` / `codex exec resume` 어댑터다. JSONL 이벤트 스트림에서 thread UUID 와 최종 agent 메시지를 뽑아 `DispatchResult` 로 정규화한다.
- 실패 사유는 stderr 가 아니라 JSONL 의 `error`·`turn.failed` 로 온다. 그 값을 `cliMessage` 로 `errorMap` 에 넘긴다 — 이것이 없으면 분류가 `unknown` 으로 떨어진다.
- 모델과 effort 는 짝으로 전달한다. codex 는 광고되지 않은 effort 를 다운그레이드하지 않고 API 에러로 거부한다.
- CLI 실행은 `@ogham/cross-platform` 을 경유한다.

## API Contracts

- 신규 실행 — 프롬프트를 받아 `DispatchResult`(응답·thread UUID·해석된 모델)를 돌려준다.
- resume — 기존 thread UUID 로 대화를 이어간다.

## Acceptance Criteria

### AC-thread-continuity — thread 연속성

- 최초 실행이 반환한 thread UUID 로 resume 이 같은 대화를 이어간다.

### AC-failure-message-source — 실패 메시지 출처

- JSONL 이 보고한 실패 메시지가 `errorMap` 분류에 전달되어 `unknown` 으로 떨어지지 않는다.

## Last Updated

2026-07-30 — codex 어댑터 계약을 문서화했다.
