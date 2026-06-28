## Purpose

`@ogham/cennad` 소스 루트. Claude 가 Codex / Antigravity / Claude CLI 에 자율 위임하도록 하는 MCP 서버, dispatcher, hooks, core 저장소를 모은 패키지 진입 모듈.

## Structure

| Directory        | Role                                                               |
| ---------------- | ------------------------------------------------------------------ |
| `types/`         | Zod 스키마 + TypeScript 타입                                       |
| `constants/`     | 경로·기본값·에러 코드 organ                                        |
| `core/`          | config / counter / session / project hash / auth token / agyModels |
| `dispatcher/`    | codex / antigravity / claude CLI 호출 본체                         |
| `mcp/`           | MCP 서버 + 3 도구 핸들러 + settings web UI                         |
| `hooks/`         | SessionStart / UserPromptSubmit 훅 구현체 (esbuild 입력)           |
| `lib/`           | atomic write, logger organ                                         |
| `utils/`         | parent-pid, iso-now organ                                          |
| `__tests__/e2e/` | E2E 회귀 스위트 (Layer A in-process + Layer B 번들 stdio)          |

## Conventions

- ESM (`"type": "module"`), import 확장자 `.js`
- 디렉토리·파일 이름은 camelCase (organ `__tests__`, `__generated__` 예외)
- 디스크 JSON 키는 snake_case (외부 인터페이스 일관성)
- 공개 API 는 `index.ts` 에서 re-export
- `version.ts` 는 `yarn version:sync` 로만 갱신

## Boundaries

### Always do

- 새 모듈 추가 시 `index.ts` 에 export 추가
- `src/hooks/*` 는 `node:*` 빌트인만 사용 (zod / MCP SDK 금지)

### Ask first

- 새 하위 fractal 추가
- 공개 API 시그니처 변경

### Never do

- `version.ts` 직접 수정
- `hooks/` 가 `core/`, `types/` import (빌드 가드 위반)
- 순환 의존성 도입

## Dependencies

- Node.js >= 20, TypeScript 5.7
- `@modelcontextprotocol/sdk`, `zod`
