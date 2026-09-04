## Purpose

`project_setup`의 `settings` action child. `127.0.0.1` 전용 설정 서버에서 config v2와 rule docs 폼을 열고 bounded long-poll 결과를 반환한다.

## Structure

| Path              | Role                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| `openSettings.ts` | `handleOpenSettings` — 서버 재사용/기동 + `awaitSettled` 대기                       |
| `types/`          | organ — `settingsTypes.ts` (상태·저장 페이로드·settle 타입 + zod)                   |
| `utils/`          | `loadSettingsHtml` (public/settings.html 로드), `buildSettingsState`, `persistSave` |
| `webServer/`      | HTTP 서버 sub-fractal (barrel `index.ts`), token/CSRF 가드, settle waiter           |
| `index.ts`        | barrel                                                                              |

## Conventions

- 응답은 `{ status: 'saved' | 'closed' | 'pending', url, summary? }` 고정
- 모듈 레벨 `currentServer` 싱글톤 — 재호출 시 재사용(`pending` 후 재대기), `onClose` 에서 nullify
- 입력은 filid 도구 공통 스타일(`path` + camelCase 보조 파라미터) — `{ path?, waitSeconds? }`
- 대기 시간은 `waitSeconds ?? DEFAULT_WAIT_SECONDS`, `[1, MAX_WAIT_SECONDS]` 클램프
- `extra.signal` 을 `awaitSettled` 에 전달 (MCP 호출 abort 전파)
- 브라우저 오픈은 신규 기동 시에만, best-effort (headless 도 URL 응답 보장)

## Boundaries

### Always do

- 프로젝트 루트는 `@ogham/cross-platform` 의 `projectRoot(path?)` 로 해석
- 저장은 반드시 configLoader core (`writeConfig`/`syncRuleDocs`) 를 경유
- v1 로드는 in-memory migration diagnostics와 함께 표시하되 저장은 v2만 허용

### Ask first

- 응답 스키마 변경 (setup 스킬 계약)
- 대기 상한 변경

### Never do

- `127.0.0.1` 외 주소로 바인딩
- token 발급/검증을 `@ogham/http-kit` 밖에서 재구현
- 상한 없는 무한 대기

## Dependencies

- `../../../../core/infra/configLoader` — `loadConfig`, `writeConfig`, `getRuleDocsStatus`, `syncRuleDocs`, `createDefaultConfig`
- `@ogham/cross-platform` — `projectRoot`, `pluginRoot`, `openBrowser`
- `@ogham/http-kit` — 요청 가드, 토큰
