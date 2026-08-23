[filid:lang:ko]

## Purpose

Atlassian setup 도구의 로컬 HTTP 서버 모듈. 저장 성공, 종료, timeout, server error를 MCP completion으로 연결하면서 재시도 가능한 제출 오류는 서버 안에 남긴다.

## Conventions

- 서버 상태와 one-shot completion은 한 `startSetupServer` closure가 소유한다.
- 라우트는 HTTP 응답을 담당하고, 실제 저장 경로는 config manager 반환값만 사용한다.

## Boundaries

### Always do

- 127.0.0.1 전용 바인딩 유지
- 모든 요청에 loopback Host + `?token=` 검증; POST 는 loopback Origin + `application/json` 강제 (rebinding·CSRF 방어)
- 자격증명은 `MASK` 상수로 가린 응답만 외부에 노출
- `__SETTINGS_STATE__` 주입 시 `escapeJsonForHtml`로 script breakout 차단
- 외부 consumer는 `index.ts` 배럴로만 접근
- config와 credentials 저장 뒤에만 성공 completion을 확정

### Ask first

- 신규 API 라우트 추가 또는 기존 라우트 삭제
- 자동 종료 시간(5분) 또는 바인딩 주소 변경

### Never do

- CORS 와일드카드(`*`) 헤더 활성화
- 모듈 전역 mutable state 사용
- 외부 모듈에서 internal 파일(handlers/, utils/)에 직접 접근
- 재시도 가능한 validation/connection/save 오류에서 completion 실패 확정
