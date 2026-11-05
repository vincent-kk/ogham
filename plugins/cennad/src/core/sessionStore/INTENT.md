## Purpose

`sessions/<projectHash>/<sessionId>.json` CRUD + TTL 기반 prune. `sha256(cwd).slice(0,12)` project-hash 로 세션을 격리하여 다른 프로젝트의 세션을 참조·오염하지 않음.

## Conventions

- 디스크 JSON 키는 snake_case (`session_id`, `project_hash`, `turn_count`, `last_used_at`)
- `tier` 는 세션을 시작한 tier 를 기록한다(기록 전 legacy 세션은 없음) — `continue_conversation` 이 모델 유지를 위해 복원
- `getSession` 은 `projectHash` 불일치 시 항상 `null` — fallback 검색 금지
- TTL은 호출자가 유효 설정의 `session_ttl_hours`에서 주입한다 — 저장소가 별도 상수를 적용하면 사용자가 정한 보존 기간과 삭제 기준이 갈라진다
- 모든 write 는 `atomicWrite` 경유; `sessionId` 는 `node:crypto` `randomUUID`

## Boundaries

### Always do

- `getSession` 은 `projectHash` 불일치 시 `null` 반환 (교차 프로젝트 검색 금지)
- `pruneExpired` 는 cennad 가 생성한 세션 파일·디렉토리만 삭제

### Ask first

- TTL 기본값·설정 해석 또는 prune 정책 변경
- `SessionMeta` 스키마 필드 추가·제거

### Never do

- 다른 `cwd` 세션 정정·수정·삭제
- cennad 가 만들지 않은 디렉토리 prune
- `atomicWrite` 우회하여 직접 `fs.writeFile` 호출
