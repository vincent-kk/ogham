## Purpose

`@ogham/r-statistics` MCP 서버 소스 루트. 도메인 무지 통계 실행 레이어: LLM 이 생성한 R 코드를 헤드리스 Rscript 로 안전 실행하고, 통계 hard gate(assert)를 결정론적으로 강제한다. 설계 명세는 [`.metadata/r-statistics/`](../../../.metadata/r-statistics/).

## Structure

| Directory    | Role                                                      |
| ------------ | --------------------------------------------------------- |
| `types/`     | `enums.ts`(object enum) + 실행/assert 인터페이스 (organ)  |
| `constants/` | paths·defaults·messages (organ)                           |
| `core/`      | rRuntime / workspace / commandGate / jobStore (실행 기반) |
| `mcp/`       | MCP 서버 + 도구 4종 + serverEntry                         |
| `lib/`       | atomicWrite, logger (organ)                               |
| `utils/`     | isoNow, randomId, sha256File, detectPlatform 등 (organ)   |

## Conventions

- ESM (`"type": "module"`), import 확장자 `.js`
- 디렉토리·파일 이름 camelCase (organ `__tests__` 예외)
- 모든 문자열 값집합은 `types/enums.ts`, 메시지는 `constants/messages.ts` — 인라인 리터럴 금지
- 모든 fractal 노드는 INTENT.md + index.ts barrel; organ(`types`/`constants`/`lib`/`utils`/`operations`)만 면제
- `version.ts` 는 `yarn version:sync` 로만 갱신

## Boundaries

### Always do

- 새 모듈 추가 시 `index.ts` 에 export
- 실행 안전(core)과 통계 정책(assert)을 분리 유지

### Ask first

- 새 하위 fractal 추가
- 공개 API 시그니처 변경

### Never do

- `version.ts` 직접 수정
- 통계 정책을 run-r 에, 실행을 assert 에 누설
- 순환 의존성 도입

## Dependencies

- Node.js >= 20, TypeScript 5.7
- `@modelcontextprotocol/sdk`, `zod`
