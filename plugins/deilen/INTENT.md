## Purpose

`@ogham/deilen` 패키지 루트. Claude 가 생성한 markdown 문서를 로컬 HTTP 서버가 브라우저 페이지로 렌더링하고, 라인 단위 피드백(파일·클립보드 이미지 포함)을 수집해 Claude 에 되돌려주는 Claude Code 플러그인. 설계 명세는 [`.metadata/deilen/`](../../.metadata/deilen/).

## Structure

| Path                         | Role                                         |
| ---------------------------- | -------------------------------------------- |
| `src/`                       | TypeScript 소스 (fractal 루트)               |
| `scripts/`                   | esbuild 빌드 스크립트                        |
| `skills/`                    | `setup`, `display` 스킬                      |
| `bridge/`                    | esbuild 산출물 (커밋 — `package.json:files`) |
| `.claude-plugin/plugin.json` | 플러그인 매니페스트                          |
| `.mcp.json`                  | MCP 서버 등록 (name: `tools`)                |

## Conventions

- 빌드: `clean → version:sync → buildViewerHtml → buildSettingsHtml → buildRenderers → tsc → buildMcpServer`
- 플러그인 prefix 없는 스킬 이름 (`setup`, `display`)
- Agent 없음, Hook 없음 (그래서 `libs/run.cjs` 도 없음)
- 무거운 렌더러는 브라우저 자산(`bridge/assets/`) — MCP 서버 번들에 미포함, 동봉 폰트 없음(KaTeX 는 MathML)

## Boundaries

### Always do

- 디스크 경로는 `~/.claude/plugins/deilen/` 하위
- 개발 착수 전 [HANDOFF.md](./HANDOFF.md) + `.metadata/deilen/` 확인

### Ask first

- 새 빌드 스크립트 추가 (파이프라인 영향)
- `package.json` 의 `files` 배열 변경

### Never do

- `dist/` 커밋 (`bridge/` 는 의도적 커밋 — `package.json:files`)
- `version.ts` / `plugin.json` 의 version 수동 수정 (inject-version.mjs 만)

## Dependencies

- 런타임: `@modelcontextprotocol/sdk ~1.22`, `zod ^3.23`, `markdown-it`, `busboy`
- 개발: `esbuild`, `typescript`, `vitest`, `@types/node`; 브라우저 자산용 `highlight.js`, `mermaid`, `katex`(번들 미포함)
- 환경: Node.js >= 20, Yarn 4.12 workspaces
