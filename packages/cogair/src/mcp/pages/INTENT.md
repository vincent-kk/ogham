## Purpose

`open_settings` 도구가 기동하는 로컬 웹 UI 의 프런트엔드 소스. 빌드 시 `scripts/buildSettingsHtml.mjs` 가 CSS·JS 를 inline + minify 해 `tools/openSettings/__generated__/settingsHtml.ts` 모듈로 직렬화.

## Structure

| Path                         | Role                                                  |
| ---------------------------- | ----------------------------------------------------- |
| `settings/index.html`        | 단일 페이지 마크업, `__COGAIR_STATE__` 토큰 슬롯 포함 |
| `settings/styles/styles.css` | dark mode (OLED) 토큰, monospace 시스템 폰트 스택     |
| `settings/scripts/app.js`    | fetch `/config`, 폼 렌더, `/save`·`/close` POST       |

## Conventions

- 외부 CDN·이미지 의존 금지 — 빌드 시 단일 HTML 문자열로 묶여 배포
- monospace 시스템 폰트 스택만 사용 (JetBrains Mono → SF Mono → Menlo → Consolas → monospace)
- token 은 URL 쿼리 `?token=<...>` 에서 읽어 동일 origin XHR 에 쿼리로 재전달
- POST body 는 항상 `Content-Type: application/json`

## Boundaries

### Always do

- 모든 fetch 호출에 `?token=` 부착
- 사용자 입력은 빌드 후 inlined `__COGAIR_STATE__` 만 신뢰 (XSS 방지는 백엔드의 escapeJsonForHtml 책임)
- `prefers-reduced-motion` 존중

### Ask first

- 외부 라이브러리 추가 (현재 0)
- 폼 필드 추가 / 키 이름 변경

### Never do

- `eval`, `Function('...')`, inline event handler 사용
- 외부 origin 으로 fetch
- 빌드 산출물 (`__generated__/`) 을 직접 수정

## Dependencies

- **빌드 시점**: `scripts/buildSettingsHtml.mjs` (`node:fs`, `node:path` 빌트인만 사용)
- **런타임 의존성 없음**: 브라우저 native API (`fetch`, `FormData`, DOM)만 사용; 외부 CDN 금지
