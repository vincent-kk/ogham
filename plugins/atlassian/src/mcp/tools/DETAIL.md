# tools — Contract

## Requirements

- 범용 도구는 4종이고 각각 독립 fractal 이다. 도메인 지식 없이 일반 HTTP·변환·상태 조회만 한다. 승인된 도메인 어댑터는 별도 fractal 로 두며 공개 `jira` entry point만 호출한다.
- 도구끼리 직접 import 하지 않는다 — 공유가 필요하면 `core` 또는 `shared` 를 경유한다.
- 외부 HTTP 는 `core/httpClient` 만 수행한다.
- 자격증명은 응답에 노출하지 않는다.

## API Contracts

- `fetch/` — HTTP GET/POST/PUT/PATCH/DELETE 통합 처리, ADF 자동 변환, 응답 본문 파일 저장(`save_to_path`).
- `convert/` — 순수 로컬 포맷 변환(네트워크 없음).
- `authCheck/` — 인증 설정 상태 보고와 선택적 연결 테스트.
- `setup/` — 로컬 HTTP 서버로 인증 설정 UI 제공.
- `jiraCommentThread/` — Jira DC reply-plugin 댓글 스레드 어댑터(`mode: read | scan | probe | save_profile`); 규칙은 `src/jira/commentThread` 가 소유.

## Acceptance Criteria

### AC-tool-isolation — 도구 격리

- 도구 fractal 사이의 직접 import 가 0건이다.

### AC-no-domain-knowledge — 도메인 무지

- 범용 도구 4종 안에 Jira·Confluence 필드 의미나 워크플로 규칙이 없고, 어댑터 안에는 공개 `jira` entry point 호출 외의 도메인 로직이 없다.

## Last Updated

2026-08-28 — 도메인 어댑터가 공개 `jira` entry point만 소비하도록 경계를 정규화했다.
