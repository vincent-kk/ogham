# server

## Purpose

MCP 서버 생성 및 9개 도구 등록. registerTool 패턴 사용.

## Structure

- `server.ts` — 서버 인스턴스 생성과 도구 등록표

## Conventions

- 도구 스키마의 `description` 이 계약 정본이다 — 호출자는 이 문장만 보고 인자를 고른다.
- 설정을 쓰는 도구는 `scope` 를 필수로 노출한다. `project` 는 `<cwd>/.imbas/config.json`(워크스페이스별, user 를 재정의), `user` 는 모든 워크스페이스가 상속하는 전역 설정을 가리키며, 어느 쪽도 기본값이 되지 않는다.

## Boundaries

### Always do

- 모든 도구 등록에 server.registerTool() 사용
- 계층을 쓰는 인자는 두 계층이 무엇을 뜻하는지 description 에 적는다

### Ask first

- 새 도구 추가

### Never do

- server.tool() 4-arg 패턴으로 도구 등록
- 핸들러 시그니처를 우회하는 도구별 특수 등록 경로 추가

## Dependencies

- `@modelcontextprotocol/sdk` — `McpServer`
- `zod` — 도구 inputSchema
- `../tools/` — 각 도구 핸들러
