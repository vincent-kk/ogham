# openSettings — Contract

## Requirements

- `open_settings` 는 HTTP 싱글톤을 기동(또는 재사용)하고 설정 페이지 URL 을 돌려준다.
- 설정 페이지는 `user`·`project` 두 레이어의 원문과 병합 결과를 함께 싣는다 — 사용자가 어느 레이어를 고치는지 보이지 않으면 저장이 반대편 파일을 덮는다.
- 프로젝트 스코프는 `ensureHttpServer` 보다 먼저 해석한다. 설정 UI 자체는 프로젝트 무관하지만 이 도구가 기동하는 공용 서버가 세션 스코프 해시를 필요로 한다.
- 브라우저 오픈은 best-effort 다 — 열지 못해도 URL 은 반환한다.

## API Contracts

- `handleOpenSettings(...)` — `ensureHttpServer(workspace).settingsUrl()` 로 만든 토큰 포함 URL 을 `{ url }` 로 돌려준다.
- 입력: `project_root?`.

## Acceptance Criteria

### AC-settings-url — 설정 진입

- 반환 URL 로 접근하면 두 레이어 상태가 실린 설정 페이지가 서빙된다.
- 서버가 이미 떠 있으면 재기동 없이 같은 인스턴스를 쓴다.
- 브라우저 오픈이 실패해도 핸들러는 URL 과 함께 성공한다.

## Last Updated

2026-07-30 — 설정 진입 계약을 문서화했다.
