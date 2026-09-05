# server — 4-tool MCP assembly

## Purpose

Filid 1.0의 4개 action-dispatched 도구를 등록하고 공통 artifact envelope, stdio transport와 cache lifecycle을 조립한다.

## Structure

- 도구 registry 조립과 process lifecycle은 `lifecycle/` 하나가 소유하고, 나머지 organ은 envelope·오류 경계와 입력 검증 지연만 맡는다.
- 이름 함정: executable entry는 이 디렉터리의 배럴이 아니라 형제 fractal serverEntry다.

## Boundaries

### Always do

- 모든 handler를 schema validation과 envelope 경계로 감싸기
- tool 이름과 등록 수를 integration test로 고정
- shutdown handler는 한 번만 등록하고 동기 cleanup만 수행

### Ask first

- 4-tool registry, action schema, envelope budget 또는 lifecycle 정책 변경
- 새로운 persistent state 도입

### Never do

- core FCA 판단이나 생태계 parsing 인라인
- 큰 data를 envelope 밖에서 raw 반환
- root 미해석 시 plugin cwd를 project로 간주
- shutdown 경로에 async I/O나 모델 호출 추가

## Dependencies

- MCP SDK, Zod, core artifact store와 host path/cache helpers
