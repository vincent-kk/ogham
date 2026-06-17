# Web UI — Settings Server

`open_settings` 가 기동하는 로컬 HTTP 서버. atlassian setup 의 `web-server/` 구조를 그대로 차용하고 도메인 필드만 cennad 의 `Config` 로 교체한다.

## 서버 사양

- 바인딩: `127.0.0.1` 전용.
- 포트: 동적 할당 (`server.listen(0, '127.0.0.1')`).
- 자동 종료:
  - 5분 idle.
  - 사용자 "저장 후 닫기" 버튼.
  - MCP 종료 시 동반 종료.
- One-time token: 기동 시 `crypto.randomBytes(16).toString('hex')` 발급, URL 쿼리 `?token=` 포함. 모든 요청에서 token 검증.
- CSRF 방어: POST 요청은 `Content-Type: application/json` 강제.
- CORS: 와일드카드 금지. 동일 origin 이므로 헤더 미설정.
- Headless 환경: 브라우저 오픈 시도 실패해도 URL stdout 반환.

## 모듈 트리

```
src/mcp/tools/openSettings/
├── INTENT.md
├── index.ts                          # export handleOpenSettings
├── openSettings.ts                   # MCP entry
├── utils/
│   ├── loadSettingsHtml.ts
│   └── persistState.ts
└── webServer/
    ├── INTENT.md
    ├── index.ts                      # barrel
    ├── webServer.ts                  # startSettingsServer, closure pattern
    ├── routing/
    │   ├── routes.ts                 # createRouteHandler
    │   └── routeContext.ts           # RouteContext interface
    ├── handlers/
    │   ├── handleGetRoot.ts          # GET / — HTML + __CENNAD_STATE__
    │   ├── handleGetConfig.ts        # GET /config — 현재 설정 JSON
    │   ├── handleGetProviderStatus.ts # GET /provider-status — CLI 가용 여부 + agyModels
    │   ├── handleSave.ts             # POST /save — 검증 + saveConfig
    │   └── handleClose.ts            # POST /close — close + 200
    └── utils/
        ├── sendJson.ts
        ├── parseBody.ts
        ├── escapeJsonForHtml.ts
        └── verifyToken.ts
```

## 라우트

| 메서드 | 경로                           | 동작                                                                                                                                                                                |
| ------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/?token=<...>`                | `settingsHtml.ts` 의 HTML 응답. `__CENNAD_STATE__` 에 현재 Config 주입.                                                                                                             |
| GET    | `/config?token=<...>`          | 현재 `Config` JSON.                                                                                                                                                                 |
| GET    | `/provider-status?token=<...>` | `{ codex, gemini, antigravity, agyModels }`. `checkExecutable` 로 CLI 가용 여부 탐지. `antigravity.available` 일 때만 `core/agyModels` 를 통해 `agy models` 실행 후 모델 목록 반환. |
| POST   | `/save?token=<...>`            | body = `Config`. 검증 후 저장.                                                                                                                                                      |
| POST   | `/close?token=<...>`           | 서버 즉시 종료. 응답 후 close.                                                                                                                                                      |

## `Config` Web 폼 매핑

| Config 필드                                                                   | UI 컴포넌트                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ratio.gemini`, `ratio.codex`, `ratio.antigravity`                            | 슬라이더 + Google 엔진 토글. UI 는 "Google 슬롯" 하나로 표현 — `google-engine` 라디오(`gemini`\|`antigravity`)가 어느 provider 의 ratio 를 활성화할지 결정. gemini 와 antigravity 는 상호 배타(`ConfigSchema.superRefine` 적용). |
| `intervention_strength`                                                       | `-2..+2` 슬라이더, tick 라벨.                                                                                                                                                                                                    |
| `keywords.gemini`, `keywords.codex`, `keywords.antigravity`                   | Google 슬롯 textarea (활성 엔진에 따라 읽기/쓰기), codex textarea. 쉼표 구분.                                                                                                                                                    |
| `default_model`                                                               | radio: high / mid / low / auto.                                                                                                                                                                                                  |
| `option_flags.gemini`                                                         | yolo toggle, sandbox toggle, sandbox-backend radio (`auto`\|`docker`\|`podman`\|`sandbox-exec`).                                                                                                                                 |
| `option_flags.codex`                                                          | yolo toggle, sandbox radio (`read-only`\|`workspace-write`\|`danger-full-access`\|`off`).                                                                                                                                        |
| `option_flags.antigravity`                                                    | sandbox toggle (하위호환 — 런타임 미부착, #76 게이트), skip-permissions toggle (`--dangerously-skip-permissions`).                                                                                                               |
| `model_map.antigravity`                                                       | per-tier 드롭다운 (`high` / `mid` / `low`). 선택지는 `/provider-status` 의 `agyModels` 배열로 동적 바인딩. antigravity 활성 시에만 표시 (`.engine-flags[data-engine=antigravity]`).                                              |
| `session_ttl_hours`                                                           | number input, 1–720.                                                                                                                                                                                                             |
| `preamble.gemini`, `preamble.codex`, `preamble.antigravity`                   | Google 슬롯 textarea (활성 엔진), codex textarea.                                                                                                                                                                                |
| `recency_factor.gemini`, `recency_factor.codex`, `recency_factor.antigravity` | Google 슬롯 radio (`off`\|`auto`\|`strict`), codex radio.                                                                                                                                                                        |

`default_options` 안에 향후 옵션이 추가되면 동일 단락에 컨트롤을 더한다.

## Google 엔진 토글 동작

UI 는 gemini 와 antigravity 를 "Google 슬롯" 단일 트랙으로 추상화한다.

- `google-engine` 라디오가 `antigravity` 로 변경되면 `ratio.antigravity` 가 활성 슬롯을 이어받고 `ratio.gemini.enabled = false` 로 저장된다.
- 반대로 `gemini` 로 변경되면 `ratio.gemini` 가 활성, `ratio.antigravity.enabled = false`.
- `preamble`, `keywords`, `recency_factor` 의 Google 슬롯 필드는 활성 엔진 키로 읽고 쓴다 (비활성 엔진 값은 동일 값으로 미러 저장).
- `/provider-status` 에서 활성 엔진 CLI 가 없으면 Google 슬롯 토글 및 advanced panel 이 비활성된다. install hint 도 활성 엔진에 따라 분기 표시.

## FE 소스 위치

```
src/mcp/pages/settings/
├── index.html
├── styles/
│   └── styles.css
└── scripts/
    └── app.js                # fetch /config, render form, POST /save, POST /close
```

빌드 시 `scripts/buildSettingsHtml.mjs` 가 css/js 를 inline + minify 한 HTML 문자열을 TS 모듈로 출력.

## 보안

- token 미검증 요청은 401 응답. 본문은 `{ success: false, message: 'Invalid token' }`.
- `__CENNAD_STATE__` 주입은 `escapeJsonForHtml` 로 `<`, `>`, `&`, U+2028, U+2029 escape.
- Config 검증 실패는 400 + `errors[]`. 저장 실패는 500.
