## Purpose

`@ogham/filid` 패키지 루트. FCA-AI 프랙탈 컨텍스트 아키텍처 규칙 시행 Claude Code 플러그인. 자체 dogfooding — 스스로를 fractal 노드로 관리. Windows 호환성은 [`.metadata/cross-platform/`](../../.metadata/cross-platform/) 에서 추적.

## Structure

| Path                         | Role                                               |
| ---------------------------- | -------------------------------------------------- |
| `src/`                       | TypeScript 소스 (fractal 루트; 자체 INTENT.md)     |
| `agents/`                    | 에이전트 정의 (architect, QA, review committee 등) |
| `hooks/`                     | Claude Code 훅 이벤트 매핑 (`hooks.json`)          |
| `skills/`                    | 사용자 스킬 디렉토리                               |
| `libs/`                      | cross-platform Node 러너 (`find-node.sh`)          |
| `scripts/`                   | esbuild 빌드 + rule-hash sync 스크립트             |
| `bridge/`                    | esbuild 산출물 (커밋 — `package.json:files` 포함)  |
| `templates/`                 | 신규 모듈용 INTENT.md / DETAIL.md 템플릿           |
| `.claude-plugin/plugin.json` | Claude Code 플러그인 매니페스트                    |
| `.mcp.json`                  | MCP 서버 등록 (`bridge/mcp-server.cjs`)            |

## Conventions

- 빌드 파이프라인: `clean → version:sync → sync-rule-hashes → tsc → mcp-server → hooks`
- 자체 FCA 규약 준수 — 50줄 INTENT.md cap, 3-tier boundary, 3+12 test rule
- 모든 훅은 `src/hooks/<name>/<name>.entry.ts` 에서 esbuild 로 번들
- 새 fractal 모듈에는 INTENT.md + DETAIL.md 동반 작성

## Boundaries

### Always do

- 빌드 후 `bridge/` 커밋 (`package.json:files` 에 포함됨)
- 새 built-in rule 의 hash 를 `scripts/sync-rule-hashes.mjs` 로 동기화

### Ask first

- 새 built-in rule 추가 또는 기존 rule severity 변경 (사용자 프로젝트 영향)
- `templates/` 변경 (신규 모듈 생성에 광범위 영향)
- INTENT.md 50줄 cap 자체의 수정 (cap 위반은 모듈 분리 신호)

### Never do

- `bridge/` 산출물 손편집 (esbuild 가 덮어씀)
- `src/version.ts` 직접 수정 (`yarn version:sync` 만)
- `dist/` 커밋 (라이브러리 export, 플러그인 매니페스트에 미포함)

## Dependencies

- **런타임**: `@ast-grep/napi ^0.42`, `@modelcontextprotocol/sdk ~1.22`, `fast-glob ^3`, `zod ^3.23`
- **개발**: `esbuild ^0.24`, `typescript ^5.7`, `vitest 3.2` — Node.js ≥ 20, Yarn 4.12 workspaces
