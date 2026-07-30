# settings — Contract

## Requirements

- "한 번 설정" 맥락이므로 필수 입력은 contact email 하나이고, 나머지는 `<details>` 고급 영역으로 접는다.
- `api_key` 는 화면에 평문으로 표시하지 않는다 — 마스킹만 한다.
- 외부 스크립트·폰트를 로드하지 않는다. 오프라인 로컬 서버에서 동작해야 하므로 시스템 폰트 스택을 쓴다.
- 서버와의 통신은 HTTP 인터페이스로 한정한다: 페이지 로드(`/`), 연결 테스트(`POST /test`), 저장(`POST /submit`). 모든 POST 본문은 JSON 이다.
- `window.__ENTREZ_STATE__ = null;` 자리 표시자를 유지한다 — 서버가 여기에 상태를 주입한다.

## API Contracts

- `index.html` — 폼 마크업과 상태 주입 자리.
- `styles/styles.css` — `prefers-color-scheme` 기반 토큰 스타일.
- `scripts/app.js` — prefill·검증·rate badge·`/test`·`/submit`.

## Acceptance Criteria

### AC-settings-minimal-required — 최소 필수 입력

- contact email 만 필수이고 나머지 필드는 고급 영역에 접혀 있다.

### AC-settings-secret-masking — 비밀 마스킹

- 저장된 `api_key` 가 화면에 평문으로 나타나지 않는다.

### AC-settings-offline — 오프라인 동작

- 페이지가 외부 스크립트·폰트를 로드하지 않는다.

## Last Updated

2026-07-30 — 설정 폼 계약을 문서화했다.
