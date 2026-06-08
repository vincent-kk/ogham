## Purpose

MCP 서버 결선 계층. 도구 정의를 모아 enable 게이트에 따라 등록하고 서버 인스턴스를 만든다.

## Structure

- `registry/` — 도구 목록·게이트·등록 루프
- `server/` — McpServer 인스턴스 팩토리
- `tools/` — 도구 정의와 공용 실행 래퍼·어노테이션 (organ)

## Boundaries

### Always do

- 도구는 `enabledBy` 게이트를 통해서만 등록한다
- 도구 실행 오류는 공용 핸들러로 표면화한다

### Ask first

- 새 도구 추가나 도구 활성화 정책 변경

### Never do

- 게이트를 우회해 무조건 등록한다
- 도구 핸들러에서 도메인 에러를 삼킨다
