## Purpose

NCBI E-utilities 설정 폼 페이지(개발자 도구 스타일, 라이트/다크). "한 번 설정" 맥락에 맞춰 필수 입력은 contact email 하나뿐이고 나머지는 `<details>` 고급으로 접는다. 서버 주입 상태를 prefill하고, EInfo 테스트·저장을 로컬 서버 API로 수행한다.

## Structure

| 파일                | 역할                                           |
| ------------------- | ---------------------------------------------- |
| `index.html`        | 폼 마크업 + 상태 주입 자리(`__ENTREZ_STATE__`) |
| `styles/styles.css` | 토큰 기반 스타일(prefers-color-scheme)         |
| `scripts/app.js`    | prefill·검증·rate badge·/test·/submit          |

## Conventions

- 의존성 없는 vanilla JS(ES5 호환), SVG 아이콘(이모지 금지), 접근성 라벨/포커스.
- 서버 발급 토큰을 `location.search` 에서 읽어 모든 `/test`·/submit 요청에 `?token=` 부착.
- masked api_key(`••••`)는 미변경 의미 — 그대로 전송.
- NCBI `tool`은 폼에 없음(서버가 상수 주입). 검색 윈도우는 상대 일수 `default_window_days`(미설정=무제한, recall 보존).
- 다운로드 경로는 서버 주입 `path_suggestions`(OS별 홈 기준) datalist 자동완성 — 브라우저 디렉토리 선택기는 실제 경로 미노출로 불가.

## Boundaries

### Always do

- 모든 인터랙션 요소에 라벨/포커스 상태. 44px 이상 터치 타깃.
- api_key는 화면 마스킹·show/hide만, 평문 영속/노출 없음.

### Ask first

- 폼 필드 추가/제거(백엔드 zod 스키마와 동기).

### Never do

- 외부 폰트/스크립트 로드. 이모지 아이콘. inline 비밀 노출.
- CSS/JS/에셋을 별도 파일로 분리 서빙 — 토큰 게이트 서버에 비토큰 정적 라우트가 없어 401. 전부 인라인 유지.

## Dependencies

- 런타임: 로컬 setup 서버 API(POST `/test`·`/submit`) — 각 요청에 `?token=` 부착
