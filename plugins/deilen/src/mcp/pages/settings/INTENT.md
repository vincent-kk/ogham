## Purpose

설정 프런트엔드. 주입된 `Config` 를 폼으로 렌더하고 변경을 `/api/config` 로 POST 한다. 빌드 시 단일 `bridge/settings.html` 로 inline+minify 된다.

## Structure

| Path                | Role                                         |
| ------------------- | -------------------------------------------- |
| `index.html`        | 단일 페이지 마크업, `__DEILEN_STATE__` 슬롯   |
| `styles/styles.css` | 테마(light/dark/auto) 토큰·타이포            |
| `scripts/app.js`    | state hydrate·폼 populate·`/api/config` POST |
| `index.ts`          | 빌드 입력 표식 (`export {}`)                 |

## Conventions

- 사용자 입력은 빌드 후 inlined `__DEILEN_STATE__` 만 신뢰 (escape 는 백엔드 책임)
- 모든 fetch 는 `?token=` 부착, POST body 는 `application/json`
- 외부 CDN·동봉 폰트 금지

## Boundaries

### Always do

- fetch 에 `?token=` 부착
- `prefers-reduced-motion` 존중

### Ask first

- 폼 필드 추가 / config 키 이름 변경
- 외부 라이브러리 추가

### Never do

- `eval`·inline 핸들러·외부 origin fetch
- 빌드 산출물(`bridge/settings.html`) 직접 수정

## Dependencies

- **빌드 시점**: `scripts/buildSettingsHtml.mjs` (`esbuild`)
- **런타임 의존성 없음**: 브라우저 native API 만
