## Purpose

`open_settings` 도구가 기동하는 로컬 웹 UI 의 프런트엔드 소스. 빌드 시 `scripts/buildSettingsHtml.mjs` 가 CSS·JS 를 inline + minify 해 `public/settings.html` 로 빌드한다 (런타임에 디스크에서 읽어 서빙).

## Structure

| Path             | Role                                                  |
| ---------------- | ----------------------------------------------------- |
| `index.html`     | 단일 페이지 마크업, `__COGAIR_STATE__` 토큰 슬롯 포함 |
| `styles/`        | `styles.css` — dark/OLED 토큰, monospace 시스템 폰트  |
| `scripts/app.js` | `fetch /config`, 폼 렌더, `/save`·`/close` POST       |

## Conventions

- 외부 CDN·이미지 의존 금지 — 빌드 시 단일 HTML 파일로 묶여 디스크에서 서빙
- token 은 URL 쿼리 `?token=<...>` 에서 읽어 동일 origin XHR 에 재전달
- POST body 는 항상 `Content-Type: application/json`
- CSS 변수로 다크 모드 토큰화

## Boundaries

### Always do

- 모든 fetch 호출에 `?token=` 부착
- `prefers-reduced-motion` 존중
- 사용자 입력은 inlined `__COGAIR_STATE__` 만 신뢰

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
