## Purpose

`open_settings` 도구 진입점. `127.0.0.1` 전용 설정 서버를 기동해 브라우저 폼
(`.filid/config.json` + rule docs)을 열고, **bounded long-poll** 로 사용자의
저장/닫기를 기다렸다가 결과를 반환한다 — setup 스킬이 같은 턴에서 다음
Phase 로 이어가는 것이 목적.

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

- 프로젝트 루트는 `@ogham/cross-platform/host-paths` 의 `projectRoot(path?)` 로 해석
- 저장은 반드시 configLoader core (`writeConfig`/`syncRuleDocs`) 를 경유

### Ask first

- 응답 스키마 변경 (setup 스킬 계약)
- 대기 상한 변경

### Never do

- `127.0.0.1` 외 주소로 바인딩
- token 발급/검증을 `@ogham/http-guard` 밖에서 재구현
- 상한 없는 무한 대기

## Dependencies

- `../../../core/infra/configLoader` — `loadConfig`, `writeConfig`, `getRuleDocsStatus`, `syncRuleDocs`, `createDefaultConfig`
- `@ogham/cross-platform/{host-paths,launcher}` — `projectRoot`, `pluginRoot`, `openBrowser`
- `@ogham/http-guard/{guard,token}` — 요청 가드, 토큰
