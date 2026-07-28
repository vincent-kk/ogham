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
    │   ├── handleGetProviderStatus.ts # GET /provider-status — CLI 가용 여부 + agyModels/codexModels
    │   ├── handleSave.ts             # POST /save — 검증 + saveConfig
    │   └── handleClose.ts            # POST /close — close + 200
    └── utils/
        ├── sendJson.ts
        ├── parseBody.ts
        ├── escapeJsonForHtml.ts
        └── verifyToken.ts
```

## 라우트

| 메서드 | 경로                           | 동작                                                                                                                                                                                                                                                                           |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/?token=<...>`                | `settingsHtml.ts` 의 HTML 응답. `__CENNAD_STATE__` 에 현재 Config 주입.                                                                                                                                                                                                        |
| GET    | `/config?token=<...>`          | 현재 `Config` JSON.                                                                                                                                                                                                                                                            |
| GET    | `/provider-status?token=<...>` | `{ codex, antigravity, claude, agyModels, codexModels }`. `checkExecutable` 로 CLI 가용 여부 탐지. 해당 CLI 가 available 일 때만 카탈로그 조회 — antigravity → `core/agyModels`(`agy models`), codex → `core/codexModels`(`codex debug models`; 모델별 지원 effort 집합 포함). |
| POST   | `/save?token=<...>`            | body = `Config`. 검증 후 저장.                                                                                                                                                                                                                                                 |
| POST   | `/close?token=<...>`           | 서버 즉시 종료. 응답 후 close.                                                                                                                                                                                                                                                 |

## `Config` Web 폼 매핑

| Config 필드                                                                   | UI 컴포넌트                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ratio.codex`, `ratio.antigravity`, `ratio.claude`                            | 3개 레인(codex / antigravity / Anthropic) 각각 enable 토글 + weight 슬라이더 (합산 normalize %).                                                                                                                                                                                                                                                                                                                                                                             |
| `intervention_strength`                                                       | `-2..+2` 슬라이더, tick 라벨.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `keywords.codex`, `keywords.antigravity`, `keywords.claude`                   | 레인별 textarea. 쉼표 구분.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `option_flags.codex`                                                          | yolo toggle, sandbox radio (`read-only`\|`workspace-write`\|`danger-full-access`\|`off`).                                                                                                                                                                                                                                                                                                                                                                                    |
| `option_flags.antigravity`                                                    | sandbox toggle (`--sandbox`, agy #76 종결·재검증 통과로 복원 — 활성화 시 런타임 부착, config `sandbox`(기본 false·opt-in)와 양방향 바인딩), skip-permissions toggle (`--dangerously-skip-permissions`).                                                                                                                                                                                                                                                                      |
| `option_flags.claude`                                                         | permission_mode 라디오 (`default`\|`acceptEdits`\|`auto`\|`dontAsk`\|`plan`\|`bypassPermissions`).                                                                                                                                                                                                                                                                                                                                                                           |
| `default_tier.<provider>`                                                     | provider 카드의 tier 라디오. **tier 를 생략한 호출에만 적용된다** — `start_conversation` 을 직접 부르는 경로가 그것이고, 세 dispatch 스킬은 작업 성격에 맞춰 매번 tier 를 고르므로 이 값을 지나친다(tier 판단은 courier 소유). hint 문구가 이 경계를 명시한다.                                                                                                                                                                                                               |
| `model_map.codex`                                                             | per-tier model 드롭다운 + effort 드롭다운. model 선택지는 `/provider-status` 의 `codexModels` 카탈로그(조회 실패 시 정적 fallback), effort 선택지는 선택된 model 이 광고한 집합으로 제한 (`ultra` 는 5.6-sol/terra 전용, 5.5/5.4 계열은 `xhigh` 상한). codex 는 미지원 effort 를 API 에러로 거부하므로 UI 가 원천 차단한다.                                                                                                                                                  |
| `model_map.antigravity`                                                       | per-tier model 드롭다운 + effort 드롭다운 (model+effort 2축). agy 카탈로그(전체 이름, 예: `Gemini 3.5 Flash (Medium)`)를 base/variant 로 분해해 model=base 목록·effort=선택된 model 의 variant 집합으로 `/provider-status` 의 `agyModels` 배열에서 동적 바인딩. 저장은 `{model, effort}`, dispatch(`modelAlias.ts`)가 `model (effort)` 로 재조합. antigravity 활성 시에만 표시.                                                                                              |
| `model_map.claude`                                                            | per-tier model 드롭다운 + effort 드롭다운. effort 선택지는 model 에 따라 적응 — haiku 는 effort 축 자체가 없어 비활성, 나머지(Claude 5 계열로 해석되는 alias 전부)는 `low`\|`medium`\|`high`\|`xhigh`\|`max`\|`ultracode`. `ultracode` 는 최상단이며 멀티에이전트 오케스트레이션 모드다. **이 목록이 유일한 게이트** — claude-code 는 미지원 단계를 에러 대신 조용히 낮춘다.                                                                                                 |
| `session_ttl_hours`                                                           | number input, 1–720.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `timeouts`                                                                    | "CLI liveness limits" 섹션 — `<details>` 로 접힌 채 두고 summary 우측에 현재 유효값을 사람이 읽는 단위로 표시(`renderTimeoutSummary`, 예: `idle 10 min · ceilings 6 h / 2 h / 1 h / 30 min`). 펼치면 idle number input 1개 + tier 별 ceiling 4개(apex/high/mid/low). 숫자 input 은 전역적으로 spinner 제거. **분 단위 입력**이며 `minutesFromMs`/`msFromMinutes` 한 쌍만 ms 변환을 안다 (저장은 `idle_ms`/`hard_cap_ms.<tier>`). 구 `spawn_timeout_ms` 단일 입력을 대체한다. |
| `preamble.codex`, `preamble.antigravity`, `preamble.claude`                   | 레인별 textarea.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `recency_factor.codex`, `recency_factor.antigravity`, `recency_factor.claude` | 레인별 radio (`off`\|`auto`\|`strict`).                                                                                                                                                                                                                                                                                                                                                                                                                                      |

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
- `__CENNAD_STATE__` 주입은 `escapeJsonForHtml` 로 `<`, `>`, `&`, U+2028, U+2029 escape.
- Config 검증 실패는 400 + `errors[]`. 저장 실패는 500.
