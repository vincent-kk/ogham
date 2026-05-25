## Purpose

`@ogham/maencof` 패키지 루트. 마크다운 기반 Knowledge Graph + Spreading Activation 검색을 제공하는 개인 지식 공간 관리 Claude Code 플러그인. Windows 호환성은 [`.metadata/cross-platform/`](../../.metadata/cross-platform/) 에서 추적.

## Structure

| Path                         | Role                                                   |
| ---------------------------- | ------------------------------------------------------ |
| `src/`                       | TypeScript 소스 (fractal 루트; 자체 INTENT.md)         |
| `agents/`                    | 에이전트 정의 (memory-organizer, identity-guardian 등) |
| `hooks/`                     | Claude Code 훅 이벤트 매핑                             |
| `skills/`                    | 사용자 스킬 디렉토리                                   |
| `libs/`                      | cross-platform Node 러너                               |
| `scripts/`                   | esbuild 빌드 스크립트                                  |
| `bridge/`                    | esbuild 산출물 (커밋)                                  |
| `templates/`                 | 5-Layer 모델 v2 vault 템플릿                           |
| `.claude-plugin/plugin.json` | Claude Code 플러그인 매니페스트                        |
| `.mcp.json`                  | MCP 서버 등록                                          |

## Conventions

- 빌드 파이프라인: `clean → version:sync → tsc → mcp-server → hooks`
- vault 경로는 `MAENCOF_VAULT_PATH` env 또는 CWD; 하드코딩 금지
- 5-Layer 모델 v2 준수 (L1~L5, sublayer 규칙은 `src/INTENT.md`)
- 문서 frontmatter 필수 필드: `id` / `layer` / `created`

## Boundaries

### Always do

- 빌드 후 `bridge/` 커밋
- 훅 또는 bridge 변경 시 `yarn build:plugin` 으로 재빌드

### Ask first

- L1_Core 문서 삭제 (정체성 영향)
- `kg_build` 를 `force: true` 로 전체 재구축
- bulk cross-layer 문서 이동

### Never do

- `.maencof/` 디렉토리 직접 수정 (런타임 캐시)
- `bridge/` 손편집 / `src/version.ts` 손편집

## Dependencies

- **런타임**: `@modelcontextprotocol/sdk ~1.22`, `fast-glob ^3`, `zod ^3.23`
- **개발**: `esbuild ^0.24`, `typescript ^5.7`, `vitest 3.2`
- **환경**: Node.js ≥ 20, Yarn 4.12 workspaces
