## Purpose

`@ogham/atlassian` 패키지 루트. Python `mcp-atlassian` 의 네이티브 TypeScript 대체. Jira / Confluence REST API 통합 Claude Code 플러그인. Windows 호환성은 [`.metadata/cross-platform/`](../../.metadata/cross-platform/) 에서 추적.

## Structure

| Path                         | Role                                               |
| ---------------------------- | -------------------------------------------------- |
| `src/`                       | TypeScript 소스 (fractal 루트; 자체 INTENT.md)     |
| `agents/`                    | 도메인 전문가 에이전트 (jira, confluence, media)   |
| `skills/`                    | 사용자 스킬 디렉토리 (lazy reference loading 패턴) |
| `scripts/`                   | esbuild 빌드 + settings HTML 번들링                |
| `bridge/` · `public/`        | esbuild 번들 + 빌드된 settings UI (둘 다 커밋)     |
| `.claude-plugin/plugin.json` | Claude Code 플러그인 매니페스트                    |
| `.mcp.json`                  | MCP 서버 등록                                      |

## Conventions

- 빌드(도메인 스크립트 조합): `clean → version:sync → pages → compile → mcp → compile-plugin`
- 의존성 방향 단방향: dispatcher → agent → skill → MCP → REST API
- skill 은 lazy reference loading — capsule 만 컨텍스트에 적재, 도메인 상세는 필요 시점에 로드
- credentials 는 `~/.claude/plugins/atlassian/credentials.json` 평문 JSON

## Boundaries

### Always do

- 빌드 후 `bridge/` · `public/` 커밋
- SSRF guard (`src/core/httpClient/ssrfGuard.ts`) 모든 outbound 요청에 적용
- ADF / Storage ↔ Markdown 변환은 `src/converter/` 의 포팅된 로직 재사용

### Ask first

- 새 인증 방식 추가 (Basic / PAT / OAuth 외)
- `src/converter/` 의 ADF / Storage 노드 매핑 변경 (Python 원본 정합성)
- credentials 저장 경로 또는 포맷 변경 (마이그레이션 영향)

### Never do

- `bridge/` 손편집
- SSRF guard 우회 또는 비활성화
- credentials 를 stdout / log 에 출력
- `src/version.ts` 직접 수정 (`yarn version:sync` 만)

## Dependencies

- **런타임**: `@modelcontextprotocol/sdk ~1.22`, `zod ^3.23`
- **개발**: `esbuild ^0.24`, `typescript ^5.7`, `vitest 3.2`
- **환경**: Node.js ≥ 20, Yarn 4.12 workspaces
