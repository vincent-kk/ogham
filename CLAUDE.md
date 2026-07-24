# ogham

Claude Code 플러그인 모노레포. 패키지별 작업 가이드는 각 `plugins/<pkg>/CLAUDE.md` 와 `plugins/<pkg>/INTENT.md` 를 참조하고, 사용자를 위한 패키지 목록과 소개는 [README](./README.md) 참조.

## Workspaces

- **Monorepo**: Yarn 4.12 workspaces (`plugins/*`)
- 6 plugins under `plugins/*` — 자세한 카탈로그는 [README.md](./README.md) 또는 [.claude-plugin/marketplace.json](./.claude-plugin/marketplace.json)
- 패키지별 작업: `yarn <pkg> <command>` (예: `yarn filid test:run`)

## Tech Stack

- TypeScript ^5.7, Node.js ≥ 20, ESM
- 빌드: tsc (ESM) + esbuild (CJS / ESM 번들) + `scripts/injectVersion.mjs`
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

각 패키지의 `build` 는 **도메인별 원자 스크립트**를 조합한다 (플러그인은 보유 도메인만 선언):

```
build = clean && version:sync && [build:rules] && [build:pages] && [build:compile] && [build:mcp] && [build:hooks] && build:compile-plugin
```

| 스크립트               | 역할                                                                                    | 산출물                                                             |
| ---------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `version:sync`         | `package.json` → `src/version.ts` + `.claude-plugin/plugin.json` (`injectVersion.mjs`) | —                                                                  |
| `build:rules`          | built-in rule hash 동기화 (filid 전용)                                                  | rule registry                                                      |
| `build:pages`          | settings / viewer / renderers HTML (esbuild)                                            | `public/`                                                          |
| `build:compile`        | `tsc -p tsconfig.build.json`                                                            | `dist/` (라이브러리 export)                                        |
| `build:mcp`            | MCP 서버 번들 (esbuild)                                                                 | `bridge/mcp-server.cjs`                                            |
| `build:hooks`          | 훅 번들 (esbuild, 훅별 개별)                                                            | `bridge/<hook>.mjs`                                                |
| `build:compile-plugin` | plugin-compiler 로 Codex/agy 어댑터 재생성 (`sync .`)                                   | `.codex-plugin/`·`mcp_config.json`·루트 `plugin.json`·`hooks.json` |

- `build:compile-plugin` 이 배포 어댑터를 build 에 자동 편입한다 — 빌드-배포 시 항상 최신. 결정적·멱등(무변경이면 재작성 없음).
- `build:plugin` = 런타임 번들만 빠르게 재빌드 (`build:pages && build:mcp && build:hooks`, clean/compile/compile-plugin 제외) — 훅·MCP 반복 개발용.
- `bridge/`·`public/` 는 플러그인 런타임 산출물로 **커밋 대상** (`package.json:files`). `dist/` 는 라이브러리 export 용(미커밋).

**훅 직접 import 원칙**: `src/hooks/**` 훅 도달 코드는 배럴(`index.js`) import 금지 — esbuild 가 배럴이 재노출하는 모듈 전체를 훅 번들로 끌어온다. 항상 구체 파일 경로로 직접 import 한다 (예: `../shared/shared.js`, `./helpers/foo/foo.js`, `constants/files.js`). typecheck 는 이를 잡지 못하며 각 패키지 `buildHooks.mjs` 의 바이트 캡 + 금지 모듈 가드가 최종 방어선 — 훅 소스 변경 후 반드시 `build:plugin` 으로 확인. (테스트·MCP 서버 코드는 대상 아님 — 배럴 경유가 정상.)

## Release Workflow

- `yarn tag:packages <commit>` → 패키지별 git tag 생성
