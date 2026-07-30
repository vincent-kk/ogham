# ruleDocsSync — Contract

## Requirements

- 브라우저를 열 수 없는 환경을 위한 헤드리스 폴백이다. 대화형 정본은 `openSettings` 이며, 둘은 같은 계획을 쓴다.
- action 은 넷이다: `status`(배포 상태), `manifest`(관리 규칙 목록), `plan`(dry-run), `sync`(실행). 여기에 다이얼을 다루는 `config` action 이 더해진다.
- `sync` 는 계획을 먼저 보여준 뒤에만 적용한다. 드리프트한 파일은 `resync` 에 id 가 명시된 것만 덮어쓴다.
- **빠진 id 는 해제로 읽힌다** — selections 에 없는 규칙은 배포 대상에서 빠진다.
- 세션 훅에서 이 도구를 호출하지 않는다.

## API Contracts

- `status` — 현재 레이어 채널의 배포 상태와 드리프트.
- `manifest` — 관리 대상 규칙 목록.
- `plan` — 적용 없이 대상·revision 을 보고한다.
- `sync` — 계획을 적용한다. `selections` 와 `resync` 를 받는다.
- `config` — 다이얼 조회·설정.

## Acceptance Criteria

### AC-plan-before-apply — 적용 전 계획

- `sync` 가 적용하는 대상이 직전 `plan` 의 대상과 일치한다.

### AC-omission-is-removal — 생략의 의미

- `selections` 에서 빠진 규칙이 배포에서 제거된다.

### AC-drift-explicit-resync — 드리프트 명시 덮어쓰기

- 드리프트한 파일은 `resync` 에 id 가 있을 때만 덮어쓰인다.

## Last Updated

2026-07-30 — 헤드리스 동기화 도구 계약을 문서화했다.
