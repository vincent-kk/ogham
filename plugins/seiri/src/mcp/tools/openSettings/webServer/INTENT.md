# webServer — 로컬 설정 서버

## Purpose

`open_settings` 가 띄우는 `127.0.0.1` 전용 HTTP 서버. 공유
`@ogham/http-guard` 로 loopback Host → 일회용 토큰 → POST Origin →
Content-Type 순으로 검증하고, 저장/닫기를 settle waiter 로 노출해 도구의
bounded long-poll 을 해소한다.

## Structure

```
webServer.ts   startSettingsServer — closure lifecycle + waiter 레지스트리
routing/       routes.ts (가드 + 디스패치) · routeContext.ts
handlers/      GET / · POST /plan · POST /save · POST /close · readSaveBody
utils/         sendJson · parseBody · escapeJsonForHtml
```

## Conventions

- 응답 본문은 `{ success, message?, errors?, ...data }` 형태로 통일.
- `/plan` 과 `/save` 는 `readSaveBody` 로 **같은 스키마 검증**을 공유한다 —
  미리보기가 통과시킨 본문을 저장이 거절하면 보여준 diff 가 적용 불가가 된다.
- `/save` 성공이 waiter 를 `{ kind: 'saved', summary }` 로 settle 하고,
  `/close` 와 서버 종료는 `{ kind: 'closed' }` 로 settle 한다.
- idle 5분 자동 종료. 단 **대기 중인 waiter 가 있으면 연장** — 작성 중인 폼을
  사용자 밑에서 닫지 않는다.
- 상태 주입은 `escapeJsonForHtml` 경유 (script 종료 문자·JS 줄 구분자 이스케이프).

## Boundaries

### Always do

- 모든 요청에서 가드 통과 후에만 비즈니스 로직 진행.
- 요청마다 idle 타이머 리셋.

### Ask first

- 새 API 경로 추가.
- 자동 종료 시간·바인딩 주소 변경.

### Never do

- CORS 와일드카드, `127.0.0.1` 외 바인딩.
- 모듈 전역 mutable state — 수명주기는 closure 반환값으로만 노출.
- 응답에 토큰 echo.
