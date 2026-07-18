## Purpose

`open_settings` 도구 진입점. `127.0.0.1` 전용 설정 서버를 기동해 브라우저 폼
(`.imbas/config.json`)을 열고, **bounded long-poll** 로 사용자의 저장/닫기를
기다렸다가 결과를 반환한다 — setup init 워크플로가 같은 턴에서 캐시 채우기로
이어간다. 세션만 아는 데이터(가용 provider, 감지 repo, Jira 프로젝트 목록)는
`bootstrap` 인자로 주입받아 페이지 상태에 포함한다.

## Structure

| Path              | Role                                                            |
| ----------------- | --------------------------------------------------------------- |
| `openSettings.ts` | `handleOpenSettings` — 서버 재사용/기동 + bootstrap 갱신 + 대기 |
| `utils/`          | `loadSettingsHtml`, `buildSettingsState`, `persistSave`         |
| `webServer/`      | HTTP 서버, 라우트, 핸들러, token/CSRF 가드, settle waiter       |
| `index.ts`        | barrel                                                          |

## Conventions

- 입력은 imbas 도구 공통 스타일(snake_case) — `{ project_root?, wait_seconds?, bootstrap? }`
- 응답은 `{ status: 'saved' | 'closed' | 'pending', url, summary?, message }` 고정
- 모듈 레벨 `currentServer` 싱글톤 — 재호출 시 재사용, 새 `bootstrap` 은 갱신
- 대기는 `wait_seconds ?? DEFAULT_WAIT_SECONDS` 를 `[1, MAX_WAIT_SECONDS]` 클램프; `extra.signal` 전파
- 브라우저 오픈은 신규 기동 시에만, best-effort (headless 도 URL 응답 보장)

## Boundaries

### Always do

- 프로젝트 루트는 `@ogham/cross-platform/host-paths` 의 `projectRoot(project_root?)` 로 해석
- 저장은 반드시 `core/configManager` 의 `saveConfig` 를 경유 (스키마 검증 후)

### Ask first

- 응답 스키마 또는 bootstrap 입력 형태 변경 (setup 스킬 계약)

### Never do

- `127.0.0.1` 외 주소로 바인딩
- token 발급/검증을 `@ogham/http-guard` 밖에서 재구현
- 상한 없는 무한 대기

## Dependencies

- `../../../core/configManager` — `loadConfig`, `saveConfig`; `../../../types/settings.js` — 페이지 계약 스키마/타입 (Zod 는 types/ 에만 — imbas src 규약)
- `@ogham/cross-platform/{host-paths,launcher}`, `@ogham/http-guard/{guard,token}`
