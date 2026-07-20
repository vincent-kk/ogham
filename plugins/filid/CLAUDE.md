# CLAUDE.md — @ogham/filid

`@ogham/filid` 패키지 작업 가이드. 패키지 contract (Purpose / Structure / Boundaries) 는 [INTENT.md](./INTENT.md), src 내부 구조는 [src/INTENT.md](./src/INTENT.md) 참조.

## Commands

```bash
yarn build              # clean → version:sync → rules → pages → compile → mcp → hooks → compile-plugin
yarn build:plugin       # pages + mcp + hooks 번들만 (clean/compile/compile-plugin 생략)
yarn typecheck          # 타입 체크 (emit 없음)
yarn test:run           # 단일 실행 (CI)
yarn test:e2e           # settings 페이지 Playwright e2e (빌드 후 실브라우저)
yarn test:coverage      # 커버리지
yarn bench:run          # 벤치마크
yarn format && yarn lint
yarn version:sync       # package.json → src/version.ts
```

## Build System

- `scripts/buildMcpServer.mjs`: `src/mcp/serverEntry/serverEntry.ts` → `bridge/mcp-server.cjs` (CJS)
- `scripts/buildHooks.mjs`: `src/hooks/<name>/<name>.entry.ts` → `bridge/<name>.mjs` (ESM, 각 훅 개별 번들)
- `scripts/buildSettingsHtml.mjs`: `src/mcp/pages/settings/**` → `public/settings.html` (인라인 단일 파일; `open_settings` 가 런타임 디스크 서빙)
- `scripts/syncRuleHashes.mjs`: built-in rule 의 hash 를 rule registry 와 동기화
- `dist/` 는 라이브러리 export 용, `bridge/` 는 플러그인 런타임용, `libs/` 는 cross-platform Node 러너 (`run.cjs`)

## Anti-Yield Discipline

LLM 이 turn 을 yield 할 수 있는 지점 (`AskUserQuestion`, `[y/N]` 프롬프트, subagent return, 외부 명령 대기 등) 이 있는 skill 은 중간 중단 위험이 있다. Tier 분류는 phase 개수가 아니라 **yield 지점의 유무와 성격** 기준이다:

- **Tier-1** (파이프라인): 상단 EXECUTION MODEL preamble + phase-transition inline directives + DO NOT STOP callouts
- **Tier-2a** (다단계 비상호작용): 동일 3-layer 패턴 적용
- **Tier-2b** (상호작용 escape hatch): step-level escape hatch preamble + `<!-- [INTERACTIVE] -->` 마커 (AskUserQuestion / `[y/N]` 지점)
- **Tier-3** (yield 지점 없음): preamble 추가 금지 (과잉 체이닝 유발)

신규 skill 추가 시 Tier-1 / 2a / 2b 에 해당하면 `plugins/filid/skills/pipeline/SKILL.md` 의 3-layer 패턴을 복제할 것. Terminal stage marker 는 `.omc/research/terminal-markers.json` 에 등록.

## Development Notes

- **AST 엔진**: `@ast-grep/napi` (tree-sitter) 단일 엔진
- **훅 수정**: `src/hooks/<name>/<name>.entry.ts` 수정 후 `yarn build:plugin` 으로 재빌드
- **훅 직접 import 원칙**: 훅 도달 코드는 배럴(`index.js`) import 금지 — 구체 파일 직접 import (`../shared/shared.js` 패턴). 리뷰가 module-entry-point 위반으로 지적해도 훅 코드는 예외 (루트 CLAUDE.md 참조)
- **테스트**: `src/**/__tests__/**/*.test.ts`, 벤치마크는 `**/*.bench.ts`
- **버전**: `src/version.ts` 직접 수정 금지 — `yarn version:sync` 사용
- **MCP 도구 참조**: 에이전트/스킬은 full-form `mcp__plugin_filid_tools__<tool>` 로 참조 (서버 키 `tools`). short-form `mcp_tools_*` 는 서브에이전트에서 해석되지 않으므로 사용 금지 (에이전트가 도구를 직접 grant 하는 경우 grant 실패).

## References

`../../.metadata/filid/`:

- `01-ARCHITECTURE.md` — 설계
- `06-HOW-IT-WORKS.md` — AST 엔진
- `07-RULES-REFERENCE.md` — 규칙
- `08-API-SURFACE.md` — API
