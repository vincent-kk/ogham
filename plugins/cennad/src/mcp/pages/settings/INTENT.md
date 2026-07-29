## Purpose

`open_settings` 도구가 기동하는 로컬 웹 UI 의 프런트엔드 소스. 빌드 시 `scripts/buildSettingsHtml.mjs` 가 CSS·JS 를 inline + minify 해 `public/settings.html` 로 빌드한다 (런타임에 디스크에서 읽어 서빙).

## Structure

| Path             | Role                                                  |
| ---------------- | ----------------------------------------------------- |
| `index.html`     | 단일 페이지 마크업, `__CENNAD_STATE__` 토큰 슬롯 포함 |
| `styles/`        | `styles.css` — dark/OLED 토큰, monospace 시스템 폰트  |
| `scripts/app.js` | `fetch /config`, 폼 렌더, `/save`·`/close` POST       |

## Conventions

- 외부 CDN·이미지 의존 금지 (빌드 시 단일 HTML); token 은 URL 쿼리 `?token=<...>` 에서 읽어 동일 origin XHR 에 재전달; POST body 는 항상 `Content-Type: application/json`; CSS 변수로 다크 모드 토큰화
- `#config_scope` 라디오(user/project)가 편집 대상 계층을 정한다 — 폼은 `/config` 가 준 `configByScope[scope]` 로 다시 앉고 `/save` 는 `scope` 를 실어 그 계층만 덮어쓴다. 현재 결정 중인 계층으로 열리며, project 파일이 없으면 해당 옵션은 disabled
- tier 는 `apex`/`high`/`mid`/`low` 4종이며 provider 마다 4행 모두 노출 — apex 도 다른 tier 와 동등하게 임의 model/effort 를 매핑할 수 있다 (기본값만 최상위)
- "CLI liveness limits" 섹션: 기본값으로 충분한 설정이라 `<details class="limits">` 로 **접힌 채** 두고, summary 우측에 현재 유효값을 사람이 읽는 단위로 표시한다(`renderTimeoutSummary`). 내용은 idle(무출력) 1개 + tier 별 ceiling 4개, **분 단위 입력**이며 `minutesFromMs`/`msFromMinutes` 한 쌍만 ms 변환을 안다. 저장 형식은 `timeouts.{idle_ms, hard_cap_ms.<tier>}` (구 `spawn_timeout_ms` 는 폐기)
- `input[type='number']` 는 spinner 를 제거한다(`appearance: textfield` + `::-webkit-*-spin-button`) — 범위는 `min`/`max` 속성과 저장 시 클램프가 지킨다
- antigravity per-tier model + effort 드롭다운 — `parseAgyModel` 이 표시명 괄호(`Gemini 3.6 Flash (High)`)와 `agy models` slug 접미사(`gemini-3.6-flash-high`; `AGY_VARIANT_SUFFIXES` 미러)를 **둘 다** base/variant 로 분해하고 디스크 값도 로드 시 같은 규칙으로 정규화한다 — 안 하면 slug 가 통째로 model 축에 들어가 effort 축이 전부 `(no effort)` 로 죽는다. 저장은 `{model: base, effort: variant}`, dispatch 가 표기에 맞춰 재조합. effort 비활성 원인은 둘로 구분(`keptAgyEffort`): 카탈로그 미독해면 저장값 보존, variant 없는 모델(`claude-sonnet-4-6`)이면 제거(남기면 `<model>-high` 를 조립해 agy 가 거부). 카탈로그는 `/provider-status` 의 `agyModels`
- Provider ratio 는 단일 segmented bar 로 조정 — 활성 provider 수가 `n`이면 경계 handle `n-1`개를 렌더링하고, 저장 포맷은 기존 `ratio.<provider>.value/enabled` 유지. **2 레이어 필수**: segment 는 `#ratio-bar-track`(pill radius + `overflow:hidden`) 안, handle 은 그 위 `#ratio-bar` 직속. 모서리는 트랙 클리핑이 만들고 segment 는 `:first-child`/`:last-child` 같은 위치 규칙을 갖지 않는다 — 한 부모에 섞이면 handle 이 `:last-child` 를 차지해 끝 segment 가 각졌었다. bar 분할 순서 = `PROVIDERS` = index.html 카드 순서(spec 이 고정). segment 음영은 렌더 시 부여하는 `data-rank`(바 내 위치)가 정해 왼쪽부터 22%→15%→9% 로 옅어진다 — provider 이름에 묶으면 카드 순서를 바꿀 때 그라데이션이 깨진다(`data-provider` 는 DOM 표식일 뿐 색과 무관)
- provider 별 advanced panel 의 `crosscheck only` 토글 → `ratio.<provider>.crosscheck_only`. 켜면 훅 자동 선출에서 빠져 crosscheck·명시 호출 전용이 되고(enabled 와 별개 축, 비율 0% 로 대체 불가), ratio bar 계산(`routableProviders`)에서도 빠져 나머지가 100% 를 재분배한다. 단 **자기 `value` 는 손대지 않고 그대로 저장**하되 카드에는 `—` 로 표시해 보이는 합이 100 을 넘지 않게 하고(저장 합이 100 을 넘어도 훅은 electable 만 본다), 키워드 입력란은 disabled 되되 값은 보존한다. 호스트 자신의 provider 제외는 훅 런타임 자동 판정이라 UI 컨트롤이 없다
- codex 레인: yolo/sandbox 컨트롤 + per-tier model 및 effort 드롭다운 — model 선택 항목은 `/provider-status` 의 `codexModels` 카탈로그(실패 시 정적 fallback), effort 선택 항목은 선택된 model 이 광고한 집합으로 제한. codex 는 미지원 effort 를 다운그레이드하지 않고 API 에러로 실패시키므로 UI 가 원천 차단한다
- Anthropic(claude) 레인: headless 위임에 맞춘 `permission_mode` 라디오(acceptEdits/auto/dontAsk/bypassPermissions, 기본 dontAsk) + per-tier model 및 effort 드롭다운 (effort 선택 항목은 선택된 model 에 따라 적응)
- 독립 "MCP Addons" 섹션 (provider 라우팅과 분리) — `addons.youtube` = enabled + language(en/ko) + targets(claude·codex·antigravity). `/save` 가 체크된 대상 CLI 의 사용자 MCP 설정(claude·codex MCP CLI / agy mcp_config.json)에 yt-dlp-mcp 서버를 등록/해제 (cennad 네임스페이스 밖 부수효과)

## Boundaries

### Always do

- 모든 사용자 노출 텍스트(`index.html`·`app.js` 의 라벨·힌트·placeholder·메시지)는 영문만 사용 — `[filid:lang]` 무관
- 모든 fetch 호출에 `?token=` 부착
- `prefers-reduced-motion` 존중
- 사용자 입력은 inlined `__CENNAD_STATE__` 만 신뢰

### Ask first

- 폼 필드 추가 또는 키 이름 변경
- 새 라우트 추가

### Never do

- `eval`, `Function('...')`, inline event handler 사용
- 외부 origin 으로 fetch
- `public/settings.html` (빌드 산출물) 직접 수정

## Dependencies

- **빌드 시점**: `scripts/buildSettingsHtml.mjs` (`node:fs`·`node:path` 빌트인만) · **런타임**: 브라우저 native API (`fetch`, `FormData`, DOM) — 외부 라이브러리 없음
