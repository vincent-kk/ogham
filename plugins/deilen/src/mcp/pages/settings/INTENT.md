## Purpose

설정 프런트엔드. 주입된 `ConfigScopeState` 를 user/project 스코프 토글과 함께 렌더하고, 선택한 레이어 하나를 `/api/config` 로 POST 한다. 빌드 시 단일 `public/settings.html` 로 inline+minify 된다.

**이 페이지가 스코프 UI 의 정본 구현이다.** 공유 UI 패키지는 없고, 계약은 `@ogham/cross-platform` 의 `DETAIL.md` "설정 페이지 계약" 절에 있다. 다른 플러그인 설정 페이지는 이 구조를 따른다.

## Structure

| Path                       | Role                                         |
| -------------------------- | -------------------------------------------- |
| `index.html`               | 단일 페이지 마크업, `__DEILEN_STATE__` 슬롯  |
| `styles/styles.css`        | 테마(light/dark/auto) 토큰·타이포            |
| `scripts/app.js`           | state hydrate·폼 populate·`/api/config` POST |
| `scripts/scopeDocument.js` | 재정의된 dot path 만 담은 project 문서 조립  |
| `index.ts`                 | 빌드 입력 표식 (`export {}`)                 |

## Conventions

- 사용자 입력은 빌드 후 inlined `__DEILEN_STATE__` 만 신뢰 (escape 는 백엔드 책임)
- 모든 fetch 는 `?token=` 부착, POST body 는 `{ scope, config }` JSON
- 스코프 토글은 masthead 브레드크럼의 세 번째 마디(`.scope-crumb`)다. 라디오 `<input>` 은 DOM 에 남기고 시각적으로만 감춘다 — 화살표 키 탐색이 거기서 나온다. 선택 표시는 밑줄, `--seal` 은 브랜드 글리프 전용
- 필드 래퍼는 `data-config-path` dot path 를 갖고, 상속 상태는 같은 요소의 `data-scope-state`(`own`/`inherited`/`overridden`)로만 표현한다. 배지·해제 버튼 노출은 CSS 가 결정한다
- project 스코프 제출은 재정의된 키만 담는다. 키를 빼는 것이 곧 재정의 해제이므로 별도 라우트가 없다
- 외부 CDN·동봉 폰트 금지
- 토큰 시트는 viewer `styles.css` 와 동일 블록 유지 — 정본 [`DESIGN.md`](../DESIGN.md)

## Boundaries

### Always do

- fetch 에 `?token=` 부착
- `prefers-reduced-motion` 존중

### Ask first

- 폼 필드 추가 / config 키 이름 변경
- 외부 라이브러리 추가

### Never do

- `eval`·inline 핸들러·외부 origin fetch
- 빌드 산출물(`public/settings.html`) 직접 수정
- `@ogham/*` 패키지 import — 배럴이 Node 전용 모듈을 재노출해 esbuild 가 브라우저 번들에서 그 그래프까지 파싱한다

## Dependencies

- **빌드 시점**: `scripts/buildSettingsHtml.mjs` (`esbuild`)
- **런타임 의존성 없음**: 브라우저 native API 만
