## Purpose

sync 실행의 오케스트레이션 — 대상 열거, facts→어댑터 계획 수립, 디스크 반영/검사. 쓰기가 일어나는 유일한 모듈.

## Conventions

- 플러그인·루트 계획은 대상 존재 확인과 facts 읽기를 허용하되 디스크를 변경하지 않는다. 실제 쓰기를 `steps/applyFiles.ts`에 모아 계획과 check 실행이 정본·산출물·디렉터리를 변경하지 않게 한다.
- `mkdirSync(dirname(...), { recursive: true })`는 sync 분기의 `writeFileSync` 직전에서만 호출한다 — check 분기는 `existsSync`/`readFileSync` 비교만 하고 디렉터리조차 만들지 않는다.
- `FileAction` 5종 고정 — `unchanged` 는 양쪽 모드 공통(비교가 먼저), `created`·`updated` 는 sync 전용, `stale`·`missing` 은 check 전용. 값을 늘릴 때는 공유 plan 타입 유니온과 CLI outcome formatter 를 함께 갱신한다.
- 어댑터 빌드 실패는 던지지 않고 진단으로 흡수한다 — `planPluginAdapters`는 알려진 MCP 이식성 오류와 Codex skill lifecycle 오류를 각 전용 진단으로 바꾸고 빈 `files`를 반환한다.

## Boundaries

### Always do

- 내용이 디스크와 동일하면 쓰지 않는다 (unchanged — mtime 불변, 결정성 확인 가능).
- check 모드는 어떤 쓰기도 하지 않는다.

### Ask first

- 어댑터 파일 경로 집합 변경 — 플레이북·DETAIL 과 동시 갱신.

### Never do

- Claude 소비 파일 경로로의 쓰기 — 대상 경로는 어댑터 경로 상수로 한정.
