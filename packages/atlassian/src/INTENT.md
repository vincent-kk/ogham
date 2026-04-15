## Purpose

Atlassian plugin source root. 3 MCP tools (fetch + convert + setup), core infrastructure, and format converter.

## Structure

| Directory | Role |
|---|---|
| `types/` | Zod schemas and type definitions |
| `constants/` | Paths, defaults, config constants |
| `core/` | Config, auth, environment, HTTP client |
| `converter/` | ADF/Storage Format ↔ Markdown |
| `mcp/` | MCP server and 3 tool handlers |
| `lib/` | Logger, file I/O |
| `utils/` | URL helpers |

## Conventions

- 모든 exports는 barrel `index.ts`를 통해 노출
- Zod 스키마는 `types/` organ에만 정의
- kebab-case 파일명, ESM `.js` 확장자 import

## Dependencies

- `@modelcontextprotocol/sdk` — MCP 서버 프레임워크
- `zod` — 런타임 스키마 검증
- Node.js `fs`, `path` — 설정 파일 I/O

## Boundaries

### Always do

- Export new modules through barrel index.ts
- Use Zod schemas from types/ for validation

### Ask first

- Add new fractal directory
- Add external dependency

### Never do

- Define Zod schemas outside types/
- Use global mutable state
- Expose credentials in MCP tool responses
