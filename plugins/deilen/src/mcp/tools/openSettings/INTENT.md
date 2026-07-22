## Purpose

`open_settings` 도구 핸들러. 로컬 서버를 기동하고 설정 UI URL 을 브라우저로 연 뒤 그 URL 을 반환한다.

## Structure

| File              | Role                                                   |
| ----------------- | ------------------------------------------------------ |
| `openSettings.ts` | 핸들러 — `ensureHttpServer` → 설정 URL → 브라우저 오픈 |
| `index.ts`        | barrel — `handleOpenSettings`, 입출력 타입             |

## Conventions

- 유일한 입력은 선택 인자 `project_root` — 설정 UI 자체는 프로젝트 무관하나, 이 도구가 기동하는 공용 서버가 세션 스코프 해시를 필요로 한다
- `ensureHttpServer(workspace).settingsUrl()` 로 토큰 포함 URL 산출
- 브라우저 오픈은 best-effort (`openBrowser`); 반환값은 항상 URL

## Boundaries

### Always do

- `ensureHttpServer` 보다 먼저 `projectRoot(input.project_root)` 해석

### Ask first

- 설정 외 페이지로 라우팅

### Never do

- 브라우저 오픈 실패를 핸들러 실패로 전파 (URL 은 반환)

## Dependencies

- `../../httpServer`, `@ogham/cross-platform/launcher` (`openBrowser`), `@ogham/cross-platform/host-paths` (projectRoot)
