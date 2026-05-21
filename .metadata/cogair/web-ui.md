# Web UI — Settings Server

`open_settings` 가 기동하는 로컬 HTTP 서버. atlassian setup 의 `web-server/` 구조를 그대로 차용하고 도메인 필드만 cogair 의 `Config` 로 교체한다.

## 서버 사양

- 바인딩: `127.0.0.1` 전용. 외부 인터페이스 노출 금지.
- 포트: 동적 할당 (`server.listen(0, '127.0.0.1')`).
- 자동 종료:
  - 5분 idle.
  - 사용자 "저장 후 닫기" 버튼.
  - MCP 종료 시 동반 종료 (process exit handler).
- One-time token: 기동 시 `crypto.randomBytes(16).toString('hex')` 발급, URL 쿼리 `?token=` 포함. 모든 요청에서 token 검증.
- CSRF 방어: POST 요청은 `Content-Type: application/json` 강제 (atlassian 패턴 동일).
- CORS: 와일드카드 금지. 동일 origin 이므로 헤더 미설정.
- Headless 환경: 브라우저 오픈 시도 실패해도 URL 만 stdout 반환.

## 모듈 트리

```
src/mcp/tools/open-settings/
├── INTENT.md
├── index.ts                          # export handleOpenSettings
├── handler.ts                        # MCP entry
├── __generated__/
│   └── settings-html.ts              # build-settings-html.mjs 산출
├── web-server/
│   ├── INTENT.md
│   ├── index.ts                      # barrel
│   ├── web-server.ts                 # startSettingsServer, closure pattern
│   ├── routes.ts                     # createRouteHandler
│   ├── route-context.ts              # RouteContext interface
│   ├── handlers/
│   │   ├── handle-get-root.ts        # GET / — HTML + __COGAIR_STATE__
│   │   ├── handle-get-config.ts      # GET /config — 현재 설정 JSON
│   │   ├── handle-save.ts            # POST /save — 검증 + saveConfig
│   │   └── handle-close.ts           # POST /close — close + 200
│   └── utils/
│       ├── send-json.ts
│       ├── parse-body.ts
│       ├── escape-json-for-html.ts   # __COGAIR_STATE__ 주입 escape
│       ├── verify-token.ts           # token 검증 헬퍼
│       └── build-state.ts            # 현재 Config → state payload
└── utils/
    └── open-browser.ts               # OS별 open command
```

## 라우트

| 메서드 | 경로 | 동작 |
|---|---|---|
| GET | `/?token=<...>` | `settings-html.ts` 의 HTML 응답. `__COGAIR_STATE__` 에 현재 Config 주입. |
| GET | `/config?token=<...>` | 현재 `Config` JSON. |
| POST | `/save?token=<...>` | body = `Config`. 검증 후 저장. |
| POST | `/close?token=<...>` | 서버 즉시 종료. 응답 후 close. |

## `Config` Web 폼 매핑

| Config 필드 | UI 컴포넌트 |
|---|---|
| `ratio.gemini`, `ratio.codex` | 두 개의 정수 입력 (min=0). 비활성 0 허용 — 0 이면 해당 provider 비활성 의도. |
| `intervention_strength` | `-2..+2` 슬라이더, 각 tick 에 라벨. |
| `keywords.gemini`, `keywords.codex` | textarea, 쉼표 구분. |
| `default_model` | radio: high / mid / low / auto. |
| `default_multi_agent` | toggle. |
| `session_ttl_hours` | number input, 1–720 범위. |

## FE 소스 위치

```
src/mcp/pages/settings/
├── index.html
├── styles/
│   └── styles.css
└── scripts/
    └── app.js                # fetch /config, render form, POST /save, POST /close
```

빌드 시 `scripts/build-settings-html.mjs` 가 css/js 를 inline + minify 한 HTML 문자열을 TS 모듈로 출력 (`atlassian/scripts/build-setup-html.mjs` 패턴 동일).

## 보안

- token 미검증 요청은 401 응답. 본문은 `{ success: false, message: 'Invalid token' }`.
- `__COGAIR_STATE__` 주입은 `escape-json-for-html` 로 `<`, `>`, `&`, U+2028, U+2029 escape (atlassian 동일).
- Config 검증 실패는 400 + `errors[]`. 저장 실패는 500.
