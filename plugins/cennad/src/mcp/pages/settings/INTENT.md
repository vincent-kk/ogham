## Purpose

`open_settings` 도구가 기동하는 로컬 웹 UI 의 프런트엔드 소스. 빌드 시 `scripts/buildSettingsHtml.mjs` 가 CSS·JS 를 inline + minify 해 `public/settings.html` 로 빌드한다 (런타임에 디스크에서 읽어 서빙).

## Structure

| Path             | Role                                                  |
| ---------------- | ----------------------------------------------------- |
| `index.html`     | 단일 페이지 마크업, `__CENNAD_STATE__` 토큰 슬롯 포함 |
| `styles/`        | `styles.css` — dark/OLED 토큰, monospace 시스템 폰트  |
| `scripts/app.js` | `fetch /config`, 폼 렌더, `/save`·`/close` POST       |

## Conventions

- 외부 CDN·이미지 의존 금지 — 빌드 시 단일 HTML 파일로 묶여 디스크에서 서빙
- token 은 URL 쿼리 `?token=<...>` 에서 읽어 동일 origin XHR 에 재전달
- POST body 는 항상 `Content-Type: application/json`
- CSS 변수로 다크 모드 토큰화
- antigravity 활성 시 per-tier model + effort 드롭다운 표시 — agy 카탈로그(전체 이름)를 base/variant 로 분해해 model=base 목록·effort=선택 model 의 variant 집합으로 바인딩; 저장은 `{model, effort}`, dispatch 가 `model (effort)` 로 재조합 (카탈로그는 `/provider-status` 의 `agyModels`)
- Provider ratio 는 단일 segmented bar 로 조정 — 활성 provider 수가 `n`이면 경계 handle `n-1`개를 렌더링하고, 저장 포맷은 기존 `ratio.<provider>.value/enabled` 유지
- provider 별 advanced panel 의 `crosscheck only` 토글 → `ratio.<provider>.crosscheck_only`. 켜면 훅 자동 선출에서 빠져 crosscheck·명시 호출 전용이 되고(enabled 와 별개 축, 비율 0% 로 대체 불가), ratio bar 계산(`routableProviders`)에서도 빠져 나머지가 100% 를 재분배한다. 단 **자기 `value` 는 손대지 않고 그대로 저장**하되 카드에는 `—` 로 표시해 보이는 합이 100 을 넘지 않게 하고(저장 합이 100 을 넘어도 훅은 electable 만 본다), 키워드 입력란은 disabled 되되 값은 보존한다. 호스트 자신의 provider 제외는 훅 런타임 자동 판정이라 UI 컨트롤이 없다
- codex 레인: yolo/sandbox 컨트롤 + per-tier model 및 effort 드롭다운 — model 선택 항목은 `/provider-status` 의 `codexModels` 카탈로그(실패 시 정적 fallback), effort 선택 항목은 선택된 model 이 광고한 집합으로 제한. codex 는 미지원 effort 를 다운그레이드하지 않고 API 에러로 실패시키므로 UI 가 원천 차단한다
- Anthropic(claude) 레인: headless 위임에 맞춘 `permission_mode` 라디오(acceptEdits/auto/dontAsk/bypassPermissions, 기본 dontAsk) + per-tier model 및 effort 드롭다운 (effort 선택 항목은 선택된 model 에 따라 적응)
- 독립 "MCP Addons" 섹션 (provider 라우팅과 분리) — `addons.youtube` = enabled + language(en/ko) + targets(codex·antigravity). `/save` 가 체크된 대상 CLI 의 MCP 설정(agy mcp_config.json / codex config.toml)에 yt-dlp-mcp 서버를 등록/해제 (cennad 네임스페이스 밖 부수효과)

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

- **빌드 시점**: `scripts/buildSettingsHtml.mjs` (`node:fs`, `node:path` 빌트인만)
- **런타임**: 브라우저 native API (`fetch`, `FormData`, DOM) — 외부 라이브러리 없음
