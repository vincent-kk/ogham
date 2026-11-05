# httpServer — DETAIL

## Requirements

- 설정 페이지에 `initialScope`를 주입한다. 공통 `resolveInitialConfigScope`가 project 설정 존재 → user 설정 존재 → 최초 project 순으로 결정하며, 페이지가 조건을 중복하지 않는다.

- 첫 `render_viewer`/`open_settings` 에서 1회 기동, 이후 재사용(싱글톤).
- 기동 시 프로젝트 스코프 해시를 1회 확정 — Claude 는 `process.cwd()`, 그 외 호스트는 도구 인자 `project_root`(부재 시 actionable throw, `process.cwd()` 폴백 금지).
- 리스너 수명 = serving 세션. 이 프로세스가 만든 세션이 하나라도 `serving` 이거나 collect 대기가 진행 중이면 idle 타이머는 재무장만 한다. 세션이 모두 닫힌 뒤(제출·dismiss·`close_viewer`·TTL 정리) 마지막 활동으로부터 `idle_shutdown_minutes`(기본 1분) 가 지나면 종료한다. 뷰어 heartbeat 는 종료 판정의 근거가 아니라 페이지 쪽 세션 상태 확인(`/api/ping` 404 → submit 비활성)이다.
- 세션 토큰 으로 `/r`·API 보호; `/assets` 는 토큰 면제(동적 import·폰트 하위요청).
- `__DEILEN_STATE__` 주입은 `escapeJsonForHtml`.
- `/api/image` 의 이미지 소스 목록(viewer.md 파싱 결과)은 세션별 소형 캐시(삽입순 상한 16, 서버 close 시 flush) — viewer.md 는 세션 생성 후 불변이므로 안전.
- 뷰어 state 에 `config.last_intent` 주입(저장된 제출 선호; 버튼 외형엔 미반영). 설정 저장(`POST /api/config`)은 폼 밖 `last_intent` 를 기존 값으로 merge-보존.
- 뷰어 state 에 `draft` 를 주입한다: `feedback.json` 이 `in_progress` 면 `{ overall, comments, updated_at }`, 없거나 `complete` 면 `null`. 함께 `session_ttl_hours` 를 주입해 페이지 쪽 초안 TTL 의 기준으로 삼는다.
- 설정은 `user`·`project` 두 레이어다. `GET /api/config` 와 `GET /settings` 는 두 레이어 원문과 병합 결과를 함께 담은 `ConfigScopeState` 를 싣고, `POST /api/config` 는 대상 레이어를 본문의 `scope` 로 받아 그 레이어만 덮어쓴다. 저장 문서는 고른 레이어에서 출발한다 — 병합 결과에서 출발하면 `user` 저장이 project 재정의를 user 파일에 구워 넣는다.
- 리스너 수명은 브라우저 heartbeat가 아니라 serving 세션에 묶는다. 숨겨진 탭의 타이머 억제가 collect 대기 종료 직후 리스너를 닫아 미전송 코멘트를 제출 불능으로 만들 수 있기 때문이다. 이 선택의 대가로 브라우저 X로 닫혀 dismiss가 오지 않은 탭은 프로세스 수명 동안 루프백 포트를 붙든다.
- `session_id` `^[A-Za-z0-9_-]+$` + sessionStore 등록분만.
- `/assets`: 단일 안전 세그먼트 + 허용 확장자 + `public/assets` 내부 존재만.
- `/api/image`: viewer.md 가 참조한 `file://` 이미지만 서빙(문서 멤버십 = allowlist, 임의 경로 차단) + 표시 확장자 화이트리스트(png/jpg/jpeg/gif/webp/svg) + `realpath` regular-file + `max_image_mb` 캡.
- token 미검증 401, 미지원 Content-Type 415, 미지원 경로 404.

## API Contracts

- 서버는 프로세스당 한 workspace를 소유한다. 기동 후 새 workspace 인자를 받아 스코프를 바꾸지 않는다.
- 설정 조회는 레이어 원문과 병합 결과를 구분한다. 저장 요청은 scope를 명시해야 하며 기본값이 없다. 조용한 기본값은 반대편 파일을 쓰게 만들기 때문이다.
- 저장은 선택한 레이어에서 출발한다. project 저장 경로가 없거나 병합 미리보기가 유효하지 않으면 거부하고, 성공 후에는 갱신된 스코프 상태를 돌려준다.

## Acceptance Criteria

검증 코드가 수용 기준을 고정하므로 별도 acceptance group을 선언하지 않는다.

## Last Updated

serving 세션 수명·스코프 저장·로컬 자산 접근 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
