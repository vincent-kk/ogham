# core — DETAIL

## Requirements

- 모든 영속 상태(config, 세션 meta/viewer/feedback, 이미지)는 `~/.claude/plugins/deilen/` 하위에 atomicWrite 로 기록.
- 세션은 `project_hash`(cwd sha256 12-hex) 스코프 — 다른 cwd 의 세션 조회는 차단.
- long-poll resolver 는 프로세스 전역 단일 슬롯/세션 + 멱등 `settle()`.

## API Contracts

- long-poll은 세션마다 한 waiter만 소유한다. 해소를 단일 멱등 경로로 모아 timeout과 abort가 경쟁해도 타이머·리스너가 남지 않게 한다.
- 피드백 수거는 문서와 세션 메타를 보존하고 피드백·첨부만 정리한다. 전체 세션 제거는 TTL·관리 경로의 책임이다.
- 세션 토큰은 공유 `@ogham/http-kit`이 소유한다. core에서 재구현하지 않는다.

## Acceptance Criteria

### AC-resolver-single-settle — long-poll 해소 단일화

- resolver 의 모든 해소 경로가 `settle()` 을 단 한 번 통과한다 — 타이머와 abort 리스너가 짝을 이뤄 해제된다.

### AC-state-degradation — 손상 상태 복원력

- 손상된 config·세션 파일은 throw 하지 않고 안전 기본값으로 degrade 한다.

### AC-session-scope-and-ttl — 스코프와 만료

- 다른 `project_hash` 의 세션 조회는 `null` 이다.
- `pruneExpired` 가 만료 세션만 제거한다.

## Last Updated

영속 상태 소유권·프로젝트 격리·resolver 해소 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
