# tools — Contract

## Requirements

- 도구 4개는 각각 독립 fractal 이며, 이 노드의 배럴은 핸들러와 입출력 타입만 노출한다.
- 도구끼리 직접 import 하지 않는다 — 공유가 필요하면 `core` 또는 `httpServer` 를 경유한다.
- 네 도구 모두 선택 인자 `project_root`(절대경로)를 받는다. Claude 에서는 생략하고 `process.cwd()` 를 쓰며, 플러그인 설치 디렉터리에서 기동하는 호스트에서는 필수다.
- 프로젝트 스코프 해석(`projectRoot(input.project_root)` → `getProjectHash`)은 핸들러의 첫 단계이며 `ensureHttpServer` 보다 먼저 일어난다 — 순서가 뒤집히면 서버 스코프와 세션 해시가 어긋난다.
- 핸들러는 평문 객체 또는 `CallToolResult` 를 반환한다. 직렬화와 throw 흡수는 `shared/wrapHandler` 가 맡는다.

## API Contracts

- `handleRenderViewer(...)` — 문서 렌더 세션을 만들고 URL 을 돌려준다(논블로킹).
- `handleCollectFeedback(...)` — bounded long-poll 로 피드백을 기다린다.
- `handleCloseViewer(...)` — 세션을 닫고 resolver 를 정리한다.
- `handleOpenSettings(...)` — 설정 UI 를 기동하고 URL 을 돌려준다.

각 도구의 입출력 계약은 소유 fractal 의 DETAIL 을 따른다. 이 배럴은 의미를 더하지 않는다.

## Acceptance Criteria

### AC-tools-scope-order — 스코프 해석 순서

- 모든 핸들러가 `ensureHttpServer` 호출 전에 프로젝트 루트를 해석한다.
- `project_root` 가 필요한 호스트에서 인자가 없으면 조용한 `process.cwd()` 폴백 없이 실행 가능한 안내와 함께 실패한다.

### AC-tools-isolation — 도구 간 격리

- 도구 fractal 사이의 직접 import 가 0건이다.

## Last Updated

2026-07-30 — 도구 컨테이너의 스코프 해석 순서와 격리 계약을 문서화했다.
