# sessionStore — Contract

## Requirements

- 세션은 `project_hash` 로 스코프된다 — 다른 cwd 에서 만든 세션 조회는 `null` 이다.
- 세션 디렉터리는 `viewer.md`(문서 원본)와 `meta.json`(상태)으로 이루어지며, 모든 쓰기는 `lib/atomicWrite` 를 거친다.
- `viewer.md` 는 세션 생성 후 불변이다 — 이 불변성이 이미지 멤버십 캐시의 근거다.
- long-poll resolver 는 세션당 프로세스 전역 단일 슬롯이며, 모든 해소 경로가 멱등 `settle()` 하나를 통과한다. 타이머와 abort 리스너는 짝을 이뤄 해제된다.
- resolver 를 `settle()` 우회로 직접 resolve 하지 않는다.

## API Contracts

- 수거한 피드백과 이미지만 정리하고 문서 원본과 메타는 보존한다. 전체 디렉터리 삭제는 TTL·관리 경로에 한정한다.
- serving 레지스트리는 이 프로세스가 만든 세션만 담는 리스너 수명의 근거다. 다른 프로세스의 세션까지 복원하는 영속 상태로 취급하지 않는다.
- close는 상태 쓰기에 성공하거나 세션이 부재·무효일 때만 serving 등록을 해제한다. 쓰기에 실패했는데 리스너가 먼저 죽으면 제출 경로를 잃으므로 등록을 유지한다.
- resolver의 모든 해소는 멱등 `settle()`을 경유하며 타이머와 abort 리스너를 함께 해제한다.

## Acceptance Criteria

### AC-session-scope — 프로젝트 스코프

- 다른 `project_hash` 로 조회하면 `null` 이다.
- 부재 세션 조회도 `null` 이며 throw 하지 않는다.

### AC-serving-registry — serving 레지스트리

- 생성 직후 `hasServingSessions()` 가 true, 닫힘·제거·만료 정리 뒤 false 다.
- 부재·무효 세션의 close는 false를 돌려주고 해당 ID의 serving 등록만 해제한다. 다른 세션의 등록은 보존하며, 제출할 수 없는 세션이 리스너를 계속 붙잡지 않게 한다.

## Last Updated

문서 불변성·resolver 해소·serving 레지스트리 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
