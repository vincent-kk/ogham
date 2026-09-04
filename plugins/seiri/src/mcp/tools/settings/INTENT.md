# settings — 설정 페이지 + 헤드리스 동기화 + 다이얼

## Purpose

규칙 선택과 개입 다이얼을 다루는 단일 MCP 표면. `action` 으로 브라우저 설정 페이지, 헤드리스 조회·계획·동기화, 런타임 다이얼을 분기하며 모든 경로가 같은 core 판정을 사용한다.

## Conventions

- `action` 은 `open`·`status`·`manifest`·`plan`·`sync`·`config` 여섯 값이다.
- `open` 은 `127.0.0.1` 전용 서버와 bounded long-poll 을 사용하며 `extra.signal` 을 전파한다.
- 모듈 레벨 서버 싱글톤은 `pending` 재호출을 이어 받고 다른 프로젝트 요청에서 교체된다.
- 헤드리스 `plan` 과 `sync`, 브라우저 `/plan` 과 `/save` 는 같은 core 계획·적용 함수를 경유한다.
- 프로젝트 루트는 `project_root` 로 받고 `@ogham/cross-platform` 의 `projectRoot(path?)` 로 해석한다.
- `config` 는 런타임 밸브만 다루며 기준선은 브라우저 저장 경로가 diff 를 보인 뒤 기록한다.
- 모든 응답은 입력과 같은 `action` 판별 키를 갖는다.

## Boundaries

### Always do

- 규칙 파일 저장은 core (`writeConfig`·`applyRuleDocs`) 경유.
- `sync` 전에 같은 입력의 `plan` 을 제안할 수 있도록 계약을 유지.
- 브라우저 저장은 `/plan` revision 을 `/save` 에 왕복하고 stale 응답을 다시 검토.

### Ask first

- `action` 추가·제거 또는 입력·응답 필드 변경.
- 대기 상한 변경.

### Never do

- 세션 훅에서 호출.
- `127.0.0.1` 외 바인딩 또는 CORS 와일드카드.
- 매니페스트에 없는 파일 기록, 사용자 확인 없는 로컬 편집 덮어쓰기.
- `config` 로 기준선(`.seiri/config.json`) 기록.
