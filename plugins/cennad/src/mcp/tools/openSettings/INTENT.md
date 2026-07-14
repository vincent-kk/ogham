## Purpose

설정용 로컬 웹 UI 기동 진입점. `127.0.0.1` 전용 HTTP 서버를 띄우고, one-time token 으로 보호된 폼을 브라우저에 노출. 5 분 idle 또는 사용자의 "Save & Close" 액션 시 자동 종료.

## Structure

| Path              | Role                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------- |
| `openSettings.ts` | `handleOpenSettings` — 활성 서버 재사용 또는 신규 기동 + `settings_server.json` 영속화 |
| `utils/`          | `loadSettingsHtml` (`public/settings.html` 런타임 로드), `persistState` (state 기록)   |
| `webServer/`      | HTTP 서버, 라우트, 핸들러, token / CSRF 가드                                           |
| `index.ts`        | barrel                                                                                 |

## Conventions

- 응답 스키마는 `{ url, message, reused }` 고정
- 모듈 레벨 `currentServer` 싱글톤 — `onClose` 콜백에서 nullify 후 state 파일 삭제
- state 파일 (`runtime/settings_server.json`) 은 시작 시 atomicWrite, 종료 시 rm — 외부 가시성 목적
- 브라우저 오픈은 best-effort: headless 환경에서도 URL 은 반드시 응답

## Boundaries

### Always do

- 동일 MCP 프로세스에서 이미 실행 중인 서버가 있으면 재사용 (`reused: true`)
- 활성 서버가 종료될 때 `runtime/settings_server.json` 도 함께 삭제
- 입력 인자 없음 — `z.object({})` 스키마 유지

### Ask first

- 응답 스키마 변경
- 모듈 레벨 싱글톤 제거 (호출자가 핸들을 들고 다니는 방식)

### Never do

- `127.0.0.1` 외 주소로 바인딩
- token 발급/검증 로직을 별도 위치에서 재구현 (`@ogham/http-guard/token` 만 사용)
- state 파일을 직접 수정하거나 다른 프로세스의 핸들을 신뢰

## Dependencies

- `node:fs/promises` — `rm` (state 파일 삭제)
- `../../../constants/paths` — `SETTINGS_SERVER_PATH`
- `./utils/loadSettingsHtml` — `loadSettingsHtml` (`public/settings.html` 런타임 로드)
- `@ogham/cross-platform/launcher` — `openBrowser` (OS별 브라우저 기동)
- `@ogham/cross-platform/host-paths` — `pluginRoot` (`public/` 자산 탐색 기준점)
- `./utils/persistState` — `persistState` (state 파일 원자적 기록)
- `./webServer` — `startSettingsServer`, `SettingsServerInstance`
