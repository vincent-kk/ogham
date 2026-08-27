# tools — Contract

## Requirements

- 도구는 넷이고 각각 독립 fractal 이다. 도메인 지식 없이 일반 HTTP·변환·상태 조회만 한다.
- 도구끼리 직접 import 하지 않는다 — 공유가 필요하면 `core` 또는 `shared` 를 경유한다.
- 외부 HTTP 는 `core/httpClient` 만 수행한다.
- 자격증명은 응답에 노출하지 않는다.

## API Contracts

- `fetch/` — HTTP GET/POST/PUT/PATCH/DELETE 통합 처리, ADF 자동 변환, 응답 본문 파일 저장(`save_to_path`).
- `convert/` — 순수 로컬 포맷 변환(네트워크 없음).
- `authCheck/` — 인증 설정 상태 보고와 선택적 연결 테스트.
- `setup/` — 로컬 HTTP 서버로 인증 설정 UI 제공.

## Acceptance Criteria

### AC-tool-isolation — 도구 격리

- 도구 fractal 사이의 직접 import 가 0건이다.

### AC-no-domain-knowledge — 도메인 무지

- 도구 안에 Jira·Confluence 필드 의미나 워크플로 규칙이 없다.

## Last Updated

2026-08-27 — fetch 의 save_to_path 저장 계약을 반영했다.
