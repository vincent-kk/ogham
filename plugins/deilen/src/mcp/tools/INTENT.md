## Purpose

deilen 의 MCP 도구 4개를 담는 fractal 컨테이너. 각 도구는 자체 서브 fractal 이며, 이 노드의 barrel 은 핸들러를 서버에 노출한다.

## Structure

| Path               | Role                                               |
| ------------------ | -------------------------------------------------- |
| `renderViewer/`    | `render_viewer` — 문서 렌더 세션 생성 (논블로킹)   |
| `collectFeedback/` | `collect_feedback` — bounded long-poll 피드백 수집 |
| `closeViewer/`     | `close_viewer` — 세션 닫기 + resolver 정리         |
| `openSettings/`    | `open_settings` — 설정 UI 기동·브라우저 오픈       |
| `index.ts`         | barrel — 4개 핸들러·입출력 타입 re-export          |

## Conventions

- 각 도구는 `handle<Tool>` 핸들러 1개를 자체 `index.ts` 로 노출
- 핸들러는 평문 객체 또는 `CallToolResult` 반환 — 직렬화·throw 흡수는 `shared/wrapHandler`
- 도구 간 직접 import 금지 — 공유 로직은 `core`/`httpServer` 경유
- 4개 도구 모두 선택 인자 `project_root`(절대경로) 수용 — Claude 는 생략(cwd), 플러그인 설치 디렉터리에서 기동되는 호스트는 필수

## Boundaries

### Always do

- 새 도구는 서브 fractal(`<tool>/index.ts`) 로 추가 후 barrel 에 등록
- 프로젝트 스코프는 `projectRoot(input.project_root)` → `getProjectHash` 로 일치 확인 (핸들러 최초 단계, `ensureHttpServer` 보다 먼저)

### Ask first

- 도구 추가/이름 변경
- 도구 입출력 스키마 변경

### Never do

- 형제 도구 내부 파일 직접 import (barrel 만 경유)
- 핸들러에서 `process.exit`

## Dependencies

- `../../core`, `../httpServer`, `../shared`, `../../types`, `../../constants`, `../../utils`
- `@modelcontextprotocol/sdk` (타입), `@ogham/cross-platform/host-paths` (projectRoot)
