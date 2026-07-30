# sessionStore — Contract

## Requirements

- 세션은 `sessions/<projectHash>/<sessionId>.json` 에 저장된다. project-hash 격리가 있어야 다른 프로젝트의 세션을 참조·오염하지 않는다.
- TTL 이 지난 세션은 prune 대상이다.
- 읽기는 부재를 정상 상태로 다룬다 — 없는 세션 조회가 예외가 되지 않는다.

## API Contracts

- 세션 CRUD — 생성·조회·갱신·삭제.
- TTL 기반 prune — 만료 세션 정리.

## Acceptance Criteria

### AC-session-isolation — 프로젝트 격리

- 다른 `projectHash` 의 세션이 조회되지 않는다.

### AC-session-ttl — 만료 정리

- TTL 초과 세션만 prune 되고 유효 세션은 남는다.

## Last Updated

2026-07-30 — 세션 저장·격리 계약을 문서화했다.
