# core — Contract

## Requirements

- core 는 디스크 저장소 게이트웨이다: config·counter·session·project-hash 의 읽기·쓰기 경로를 소유한다.
- 모든 쓰기는 `lib/atomicWrite`(tmp → rename)를 거친다. 직접 `fs.writeFile` 을 부르지 않는다.
- 디스크 JSON 키는 snake_case 다(외부 인터페이스).
- 외부 CLI 조회 캐시(`agyModels`·`codexModels`)는 실패를 정상 경로로 다룬다 — 조회 실패가 UI 나 dispatch 를 막지 않는다.
- 세션 토큰은 공유 `@ogham/http-kit` 이 소유한다 — core 가 재구현하지 않는다.

## API Contracts

- `configManager` — 두 레이어 config 로드·저장.
- `counterManager` — provider 호출 카운터(세션 격리).
- `sessionStore` — 세션 CRUD 와 TTL prune.
- `projectHash` — cwd → 12-hex 스코프 해시.
- `agyModels`·`codexModels` — 외부 모델 카탈로그 캐시.
- `artifactWriter` — 선택적 마크다운 미러링.
- `youtubeMcp` — yt-dlp MCP addon 등록·해제.

## Acceptance Criteria

### AC-atomic-writes — 원자적 쓰기

- core 하위에 `fs.writeFile` 직접 호출이 없다.

### AC-cache-degradation — 캐시 실패 내성

- 모델 카탈로그 조회 실패가 예외로 전파되지 않는다.

## Last Updated

2026-07-30 — 저장소 게이트웨이 계약을 문서화했다.
