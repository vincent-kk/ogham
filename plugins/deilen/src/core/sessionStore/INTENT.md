# sessionStore — 렌더 세션 영속·resolver 레지스트리

## Purpose

렌더 세션의 디스크 영속(메타와 뷰어 본문)과 long-poll resolver 레지스트리를 소유한다. 세션은 `project_hash` 로 스코프되어, 다른 작업 디렉토리에서 만든 세션은 보이지 않는다.

## Conventions

- 디스크 쓰기는 모두 원자 쓰기 헬퍼를 거친다. 디스크 JSON 키는 코드의 camelCase 와 달리 snake_case 다 — 저장 포맷과 코드 표기가 갈리는 지점이다.
- 세션 조회는 언제나 `project_hash` 일치를 확인하고, 불일치는 오류가 아니라 `null` 이다.
- resolver 의 모든 해소 경로는 단일 멱등 `settle()` 을 통과한다. timer 와 abort 리스너는 항상 짝지어 해제한다.
- 살아 있는 세션 집합은 process-local 이다 — HTTP 리스너 수명의 근거이지 영속 상태가 아니다.

## Boundaries

### Always do

- 세션 조회 시 `project_hash` 일치 확인
- resolver 해소는 `settle()` 경유 (timer unref)

### Ask first

- 세션 메타 스키마 변경
- long-poll buffer/superseded 의미 변경

### Never do

- 네트워크 I/O (디스크·메모리 순수)
- resolver 를 `settle()` 우회해 직접 resolve
