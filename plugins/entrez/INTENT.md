## Purpose

`@ogham/entrez` 패키지 루트. Claude를 NCBI E-utilities(PubMed·PMC·MeSH) "학술 논문 검색 전문가"로 만드는 Claude Code 플러그인. 유일한 책임은 검색 **누락 방지(recall)**. 설계 정본은 [`.metadata/entrez/`](../../.metadata/entrez/).

## Structure

| 경로                                       | 역할                                                  |
| ------------------------------------------ | ----------------------------------------------------- |
| `src/`                                     | TypeScript 소스(프랙탈 루트; 자체 INTENT.md)          |
| `skills/`                                  | 노출 스킬 4 (search·query·download·setup) — 마크다운  |
| `agents/`                                  | `paper-search-expert`(생성/재랭킹 2모드) + references |
| `scripts/`                                 | esbuild MCP 서버 + settings HTML 번들                 |
| `bridge/` · `public/`                      | 빌드 산출물(둘 다 커밋)                               |
| `.claude-plugin/plugin.json` · `.mcp.json` | 매니페스트·MCP 등록                                   |

## Conventions

- 빌드: `clean → version:sync → (settings-html) → tsc → mcp-server`.
- 의존성 단방향: Dispatcher → Agent → Skill → MCP → httpClient → NCBI.
- FCA·1함수1파일·문자열 리터럴 상수화·hook 미사용.

## Boundaries

### Always do

- 빌드 후 `bridge/`·`public/` 커밋. 모든 outbound 요청에 SSRF allowlist 적용.

### Ask first

- 새 인증 방식 추가, credentials 저장 경로·포맷 변경.

### Never do

- `bridge/` 손편집, SSRF guard 우회, `api_key`를 stdout/log 노출, `src/version.ts` 직접 수정.

## Dependencies

- **런타임**: `@modelcontextprotocol/sdk ~1.22`, `zod ^3.23`
- **개발**: `esbuild ^0.24`, `typescript ^5.7`, `vitest 3.2`, `@ogham/cross-platform`
- **환경**: Node.js ≥ 20, Yarn 4.12 workspaces
