# CLAUDE.md — @ogham/filid

`@ogham/filid` 패키지 작업 가이드. 패키지 contract (Purpose / Structure / Boundaries) 는 [INTENT.md](./INTENT.md), src 내부 구조는 [src/INTENT.md](./src/INTENT.md) 참조.

## Commands

```bash
yarn build              # clean → version:sync → sync-rule-hashes → tsc → mcp-server → hooks
yarn build:plugin       # mcp-server + hooks 번들만 (tsc 생략)
yarn typecheck          # 타입 체크 (emit 없음)
yarn test:run           # 단일 실행 (CI)
yarn test:coverage      # 커버리지
yarn bench:run          # 벤치마크
yarn format && yarn lint
yarn version:sync       # package.json → src/version.ts
```

## Build System

- `scripts/build-mcp-server.mjs`: `src/mcp/serverEntry/serverEntry.ts` → `bridge/mcp-server.cjs` (CJS)
- `scripts/build-hooks.mjs`: `src/hooks/<name>/<name>.entry.ts` → `bridge/<name>.mjs` (ESM, 각 훅 개별 번들)
- `scripts/sync-rule-hashes.mjs`: built-in rule 의 hash 를 rule registry 와 동기화
- `dist/` 는 라이브러리 export 용, `bridge/` 는 플러그인 런타임용, `libs/` 는 cross-platform Node 러너 (`find-node.sh`)

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
- **테스트**: `src/**/__tests__/**/*.test.ts`, 벤치마크는 `**/*.bench.ts`
- **버전**: `src/version.ts` 직접 수정 금지 — `yarn version:sync` 사용

## References

`../../.metadata/filid/`:

- `01-ARCHITECTURE.md` — 설계
- `06-HOW-IT-WORKS.md` — AST 엔진
- `07-RULES-REFERENCE.md` — 규칙
- `08-API-SURFACE.md` — API
