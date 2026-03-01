# ogham

Claude Code 플러그인 모노레포. AI 에이전트 워크플로우 확장 도구 모음.

## Project Structure

- **Monorepo**: Yarn 4.12 workspaces (`packages/*`)
- **Package**: `@ogham/filid` (v0.0.2) — FCA-AI rule enforcement Claude Code plugin
- **Package**: `@ogham/maencof` (v0.0.1) — 개인 지식 공간 관리 plugin (Knowledge Graph + Spreading Activation)

```
packages/filid/    # FCA-AI 프랙탈 구조 규칙 엔진 (14 MCP tools, 7 agents, 14 skills)
packages/maencof/  # 마크다운 Knowledge Graph 기반 지식 관리 (10 MCP tools, 4 agents, 21 skills)
```

## Tech Stack

- TypeScript 5.7.2, Node.js >=20, ESM
- Build: tsc (ESM) + esbuild (CJS/ESM 번들)
- Test: Vitest 3.2
- MCP: @modelcontextprotocol/sdk
- Validation: Zod

## Commands

```bash
# 모노레포 전체
yarn build:all          # 전체 빌드
yarn test:run           # 전체 테스트
yarn typecheck          # TypeScript 타입 체크
yarn lint               # ESLint 검사

# 패키지별 (yarn <pkg> <cmd>)
yarn filid build        # filid 빌드 (tsc + esbuild)
yarn filid test:run     # filid 테스트
yarn maencof build      # maencof 빌드 (tsc + esbuild)
yarn maencof test:run   # maencof 테스트
```

## Conventions

- ESM modules (`"type": "module"`)
- 버전: `scripts/inject-version.mjs`로 빌드 시 자동 주입
- 릴리즈: Changesets 기반 (`yarn changeset`)
