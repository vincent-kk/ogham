# Web UI — Settings Server

`open_settings` 가 기동하는 로컬 HTTP 서버. atlassian setup 의 `web-server/` 구조를 그대로 차용하고 도메인 필드만 cogair 의 `Config` 로 교체한다.

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
├── handler.ts                        # MCP entry
├── __generated__/
│   └── settingsHtml.ts               # buildSettingsHtml.mjs 산출
├── webServer/
│   ├── INTENT.md
│   ├── index.ts                      # barrel
│   ├── webServer.ts                  # startSettingsServer, closure pattern
│   ├── routes.ts                     # createRouteHandler
│   ├── routeContext.ts               # RouteContext interface
│   ├── handlers/
│   │   ├── handleGetRoot.ts          # GET / — HTML + __COGAIR_STATE__
│   │   ├── handleGetConfig.ts        # GET /config — 현재 설정 JSON
│   │   ├── handleSave.ts             # POST /save — 검증 + saveConfig
│   │   └── handleClose.ts            # POST /close — close + 200
│   └── utils/
│       ├── sendJson.ts
│       ├── parseBody.ts
│       ├── escapeJsonForHtml.ts
│       ├── verifyToken.ts
│       └── buildState.ts
└── utils/
    └── openBrowser.ts
```

## 라우트

| 메서드 | 경로 | 동작 |
|---|---|---|
| GET | `/?token=<...>` | `settingsHtml.ts` 의 HTML 응답. `__COGAIR_STATE__` 에 현재 Config 주입. |
| GET | `/config?token=<...>` | 현재 `Config` JSON. |
| POST | `/save?token=<...>` | body = `Config`. 검증 후 저장. |
| POST | `/close?token=<...>` | 서버 즉시 종료. 응답 후 close. |

## `Config` Web 폼 매핑

| Config 필드 | UI 컴포넌트 |
|---|---|
| `ratio.gemini`, `ratio.codex` | 두 개의 정수 입력 (min=0). 0 허용 — 해당 provider 비활성 의도. |
| `intervention_strength` | `-2..+2` 슬라이더, tick 라벨. |
| `keywords.gemini`, `keywords.codex` | textarea, 쉼표 구분. |
| `default_model` | radio: high / mid / low / auto. |
| `default_options.multi_agent` | toggle. provider 별 미지원 안내 문구 함께 표시. |
| `session_ttl_hours` | number input, 1–720. |

`default_options` 안에 향후 옵션이 추가되면 동일 단락에 컨트롤을 더한다.

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
- `__COGAIR_STATE__` 주입은 `escapeJsonForHtml` 로 `<`, `>`, `&`, U+2028, U+2029 escape.
- Config 검증 실패는 400 + `errors[]`. 저장 실패는 500.
