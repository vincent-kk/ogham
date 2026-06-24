## Purpose

`@ogham/deilen` 소스 루트. Claude 가 생성한 markdown 문서를 로컬 HTTP 서버가 브라우저 페이지로 렌더링하고, 라인 단위 피드백(파일·클립보드 이미지 포함)을 수집해 Claude 에 되돌려주는 MCP 패키지의 진입 모듈.

## Structure

| Directory    | Role                                                           |
| ------------ | -------------------------------------------------------------- |
| `types/`     | Zod 스키마·타입·`enums.ts` object enum 단일 소스 (organ)       |
| `constants/` | 경로·기본값 (organ)                                            |
| `core/`      | config / session(+pendingResolver) / feedback / authToken 저장 |
| `render/`    | markdown → source-line 매핑 HTML (서버측 base 렌더)            |
| `mcp/`       | MCP 서버 + 4 도구 + httpServer(뷰어·피드백·설정) + 뷰어 FE     |
| `lib/`       | atomicWrite, logger (organ)                                    |
| `utils/`     | isoNow, randomId (organ)                                       |

## Conventions

- ESM (`"type": "module"`), import 확장자 `.js`
- 디렉토리·파일 이름은 camelCase (organ `__tests__` 예외)
- 디스크 JSON 키는 snake_case (외부 인터페이스 일관성)
- 공개 API 는 `index.ts` 에서 re-export
- `version.ts` 는 `yarn version:sync` 로만 갱신
- 모든 fractal 노드는 INTENT.md + index.ts barrel; leaf organ(`types`/`constants`/`lib`/`utils`/`handlers`/`routing`)만 INTENT.md 면제

## Boundaries

### Always do

- 새 모듈 추가 시 `index.ts` 에 export 추가
- 무거운 렌더러(Mermaid/highlight/KaTeX)는 브라우저 자산 — 서버 코드가 import 금지

### Ask first

- 새 하위 fractal 추가
- 공개 API 시그니처 변경

### Never do

- `version.ts` 직접 수정
- `mcp-server.cjs` 번들에 렌더러 라이브러리 포함 (빌드 가드 위반)
- 순환 의존성 도입

## Dependencies

- Node.js >= 20, TypeScript 5.7
- `@modelcontextprotocol/sdk`, `zod`, `markdown-it`
