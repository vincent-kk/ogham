# openSettings — Contract

## Requirements

- 설정 페이지에 `initialScope`를 주입한다. 공통 `resolveInitialConfigScope`가 project 설정 존재 → user 설정 존재 → 최초 project 순으로 결정하며, 페이지가 조건을 중복하지 않는다.

- MCP 도구 `open_settings` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸며, 이 도구만 MCP 요청의 `extra.signal` 을 받아 대기 중 취소를 관측한다.
- 대기는 반드시 유한하다. `wait_seconds` 를 `[1, MAX_WAIT_SECONDS]` 로 클램프하고 기본값은 `DEFAULT_WAIT_SECONDS` 다 — 무한 대기는 세션을 붙잡는다.
- 상한이 지나도 폼을 닫지 않는다. `pending` 은 "아직"이라는 답이며, 같은 세션에서 다시 호출해 대기를 이어 간다. setup 워크플로가 같은 턴에서 캐시 채우기로 넘어갈 수 있는 이유다.
- 서버는 프로젝트 루트당 하나다. 다른 루트로 호출이 오면 기존 서버를 닫고 새로 띄운다 — 한 서버가 두 워크스페이스의 설정을 섬길 수 없다.
- 세션만 아는 사실(가용 provider, 감지한 repo, Jira 프로젝트 목록)은 `bootstrap` 으로 주입받는다. 이 핸들러가 원격을 조회하지 않는다.
- 저장은 `core/configManager` 의 `saveConfig` 만 거친다. 라벨 프로비저닝 같은 페이지 의도는 요약으로만 전달하고 여기서 실행하지 않는다.

## API Contracts

- bootstrap을 생략한 재호출은 마지막 주입값을 유지한다. 원격 조회를 핸들러로 옮기지 않는다.
- pending에는 재열기에 필요한 토큰 URL을 주지만 saved·closed에는 토큰 없는 origin만 반환한다. 종료된 흐름에 토큰을 되울리지 않는다.
- 설정 HTML은 런타임 파일로 읽어 프로세스 수명 동안 캐시한다. MCP 번들에 인라인하지 않으며 자산 부재는 시작 실패다.
- 브라우저 열기는 신규 기동에서만 best-effort로 시도한다. OGHAM_NO_BROWSER에서도 URL 응답은 유지한다.
- 계층별 편집 뷰와 원본 계층 정보는 구별한다. HTTP 가드와 waiter 수명은 자식 서버의 계약이다.

## Acceptance Criteria

### AC-bounded-wait — 유한 대기

- `wait_seconds` 는 1 미만이면 1로, 600 초과면 600으로 클램프된다. 생략 시 300 이다.
- 상한이 지나면 `pending` 으로 반환한다 — 무한정 매달리지 않는다.

### AC-pending-keeps-session — pending 은 세션을 유지한다

- `pending` 응답 뒤 서버가 살아 있고, 같은 프로젝트 루트로 다시 호출하면 새 서버를 띄우지 않고 같은 세션에서 대기를 이어 간다.

### AC-token-not-echoed-on-terminal — 종료 응답에 토큰 없음

- `saved`·`closed` 응답의 `url` 에는 `token` 질의 문자열이 없다.

### AC-server-follows-root — 루트를 따라가는 서버

- 다른 `project_root` 로 호출하면 기존 서버가 닫히고 새 루트에 바인딩된 서버가 뜬다.

### AC-saved-carries-summary — 저장 결과 요약

- `saved` 응답에만 `summary` 가 실리고, 그 시점에 지정된 계층 설정 파일이 기록되어 있다.

## Last Updated

설정 서버 재사용·대기·bootstrap·저장 계약의 내용과 근거가 바뀔 때 갱신한다.
