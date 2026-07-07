# ogham

Claude Code 플러그인 모노레포. 패키지별 작업 가이드는 각 `plugins/<pkg>/CLAUDE.md` 와 `plugins/<pkg>/INTENT.md` 를 참조하고, 사용자를 위한 패키지 목록과 소개는 [README](./README.md) 참조.

## Workspaces

- **Monorepo**: Yarn 4.12 workspaces (`plugins/*`)
- 6 plugins under `plugins/*` — 자세한 카탈로그는 [README.md](./README.md) 또는 [.claude-plugin/marketplace.json](./.claude-plugin/marketplace.json)
- 패키지별 작업: `yarn <pkg> <command>` (예: `yarn filid test:run`)

## Tech Stack

- TypeScript ^5.7, Node.js ≥ 20, ESM
- 빌드: tsc (ESM) + esbuild (CJS / ESM 번들) + `scripts/inject-version.mjs`
- 테스트: Vitest 3.2
- MCP: `@modelcontextprotocol/sdk ~1.22`
- Validation: Zod (`zod ^3.23`)

## Monorepo Commands

```bash
yarn build:all          # 전체 빌드 (workspaces foreach)
yarn test:run           # 전체 테스트 단일 실행 (CI)
yarn typecheck          # 전체 typecheck (tsc -b)
yarn lint               # 전체 ESLint
yarn clean              # 전체 dist / .tsbuildinfo 제거
```

## Common Build Pipeline

각 패키지는 동일 패턴을 따름:

1. `yarn version:sync` — `package.json` → `src/version.ts` + `.claude-plugin/plugin.json` 동기화 (`scripts/inject-version.mjs`)
2. `tsc -p tsconfig.build.json` — `src/` → `dist/` (ESM + `.d.ts`)
3. `esbuild` (개별 스크립트) — `bridge/mcp-server.cjs` + `bridge/<hook>.mjs`

`bridge/` 는 플러그인 런타임 산출물로 **커밋 대상** (`package.json:files`). `dist/` 는 라이브러리 export 용.

**훅 직접 import 원칙**: `src/hooks/**` 훅 도달 코드는 배럴(`index.js`) import 금지 — esbuild 가 배럴이 재노출하는 모듈 전체를 훅 번들로 끌어온다. 항상 구체 파일 경로로 직접 import 한다 (예: `../shared/shared.js`, `./helpers/foo/foo.js`, `constants/files.js`). typecheck 는 이를 잡지 못하며 각 패키지 `build-hooks.mjs` 의 바이트 캡 + 금지 모듈 가드가 최종 방어선 — 훅 소스 변경 후 반드시 `build:plugin` 으로 확인. (테스트·MCP 서버 코드는 대상 아님 — 배럴 경유가 정상.)

## Release Workflow

- `yarn tag:packages <commit>` → 패키지별 git tag 생성
