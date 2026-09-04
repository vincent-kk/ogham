# webServer — Contract

## Requirements

- `127.0.0.1` 에만 바인딩한다. CORS 와일드카드를 두지 않는다.
- 토큰·Origin 검증은 `@ogham/http-kit` 을 재사용한다 — 이 모듈에서 재구현하지 않는다.
- `/plan` 과 `/save` 는 같은 본문 스키마를 받고 같은 판정 함수를 거친다.
- 브라우저는 `/plan` 이 준 revision 을 `/save` 로 왕복시키고, stale 응답은 사용자가 다시 검토하게 만든다.
- 저장은 core(`writeConfig`·`applyRuleDocs`)를 경유한다. 이 계층이 직접 파일을 쓰지 않는다.

## API Contracts

- `GET /` — 설정 폼(토큰 필요).
- `POST /plan` — dry-run. 대상·revision 을 돌려준다.
- `POST /save` — revision 이 유효할 때만 적용하고 settle 한다.
- 라우트·가드·핸들러는 각각 `routing/`·`handlers/` organ 이 소유한다.

## Acceptance Criteria

### AC-loopback-guard — 바인딩·가드

- `127.0.0.1` 외 주소에서 접근할 수 없다.
- 토큰 없는 요청과 비-loopback Origin 의 POST 가 거부된다.

### AC-revision-staleness — revision 검사

- `/plan` 이후 대상이 바뀌면 `/save` 가 적용하지 않고 stale 을 알린다.

### AC-write-through-core — 쓰기 경로 단일화

- 규칙·다이얼 쓰기가 core 함수를 거친다.

## Last Updated

2026-07-30 — 설정 서버의 가드와 revision 계약을 문서화했다.
