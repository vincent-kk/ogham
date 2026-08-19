# registrations

## Purpose

도구 등록 wrapper. 도메인별로 MCP 도구를 서버에 등록하는 함수만 소유하고, 오케스트레이션은 부모 [`server`](../INTENT.md)의 `server.ts` 가 한다. 핸들러 구현은 `mcp/tools/` 가 소유하며 여기서는 등록만 한다.

## Structure

- 등록 함수는 `operations/` 아래에서 도구 도메인 단위로 갈린다 — 파일 하나가 `createServer()` 가 한 번에 호출하는 등록 단위이고, 도메인이 아니라 파일 크기로 쪼개면 그 호출 목록이 경계 의미를 잃는다. 그룹 경계 변경이 아래 `Ask first` 인 이유다.

## Boundaries

### Always do

- 핸들러는 `mcp/tools/` barrel 에서 가져온다 — 등록부에 로직을 인라인하지 않는다
- 부수효과가 필요한 도구는 `middlewares` 의 `registerMutateTool` / `registerReadTool` 을 경유한다
- 도구 등록명은 `constants` 의 도구 이름 상수에서 가져온다

### Ask first

- 새 도메인 파일 추가 (등록 그룹 경계 변경)
- 읽기 도구를 mutate 등록으로 승격하거나 그 반대로 바꾸는 변경

### Never do

- 도구 핸들러 로직을 이 디렉터리에 작성
- `server.ts` 의 오케스트레이션 순서를 여기서 재정의
- 등록 실패를 조용히 삼키기 (서버 기동이 도구 부재를 모르게 되면 안 된다)
