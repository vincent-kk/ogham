## Purpose

setup 도구가 제공하는 브라우저 페이지의 **프론트엔드 소스**(마크업/스타일/스크립트). TS 번들이 아니라 빌드 시 `public/settings.html` 정적 파일로 인라인된다.

## Structure

| 디렉토리    | 역할                                          |
| ----------- | --------------------------------------------- |
| `settings/` | 설정 폼 페이지(index.html · styles · scripts) |

## Conventions

- 외부 의존성·외부 폰트 없음(오프라인 로컬 서버 동작). 시스템 폰트 스택 사용.
- 서버 API와의 계약(`/`·`/status`·`/test`·`/submit`)만 통신, HTTP 인터페이스 한정.

## Boundaries

### Always do

- `window.__ENTREZ_STATE__ = null;` 자리 표시자 유지(서버 주입). 모든 POST는 JSON.

### Ask first

- API 경로·요청 본문 형태 변경(백엔드 핸들러와 동기 필요).

### Never do

- api_key 평문을 화면에 표시(마스킹만). 외부 스크립트/폰트 로드.

## Dependencies

- (빌드) `scripts/buildSettingsHtml.mjs` — esbuild로 인라인
