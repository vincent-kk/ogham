# server — 9-tool MCP assembly

## Purpose

Filid 1.0의 9개 도구를 등록하고 공통 artifact envelope, stdio transport와 cache lifecycle을 조립한다.

## Structure

- `createServer.ts` — 고정 tool registry 조립
- `toolResult.ts` / `toolError.ts` / `wrapHandler.ts` — envelope와 오류 경계
- `startServer.ts` / lifecycle helpers — transport, boot sweep와 동기 shutdown
- executable entry는 `serverEntry/`이며 이 디렉터리의 `index.ts`가 아니다.

## Boundaries

### Always do

- 모든 handler를 schema validation과 envelope 경계로 감싸기
- tool 이름과 등록 수를 integration test로 고정
- shutdown handler는 한 번만 등록하고 동기 cleanup만 수행

### Ask first

- tool registry, envelope schema·budget 또는 lifecycle 정책 변경
- 새로운 persistent state 도입

### Never do

- core FCA 판단이나 생태계 parsing 인라인
- 큰 data를 envelope 밖에서 raw 반환
- root 미해석 시 plugin cwd를 project로 간주
- shutdown 경로에 async I/O나 모델 호출 추가

## Dependencies

- MCP SDK, Zod, core artifact store와 host path/cache helpers
