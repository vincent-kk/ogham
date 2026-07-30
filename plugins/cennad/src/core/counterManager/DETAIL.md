# counterManager — Contract

## Requirements

- `runtime/counter.json` 으로 provider(codex·antigravity·claude) 호출 횟수를 추적한다.
- 파일의 `parent_pid` 가 현재 세션 PID 와 다르면 카운트를 0/0/0 으로 간주하고 다음 쓰기에서 갱신한다 — 세션마다 자동 격리되며 별도 리셋 훅이 필요 없다.
- 카운터 리셋은 이 모듈의 책임이다. 훅은 읽기만 한다.

## API Contracts

- 카운터 읽기 — 현재 세션의 provider 별 호출 수.
- 카운터 증가·기록 — `parent_pid` 와 함께 저장한다.

## Acceptance Criteria

### AC-counter-session-isolation — 세션 격리

- `parent_pid` 가 다르면 이전 세션 카운트가 0으로 읽힌다.
- 다음 쓰기에서 `parent_pid` 가 현재 세션으로 갱신된다.

## Last Updated

2026-07-30 — 호출 카운터의 세션 격리 계약을 문서화했다.
