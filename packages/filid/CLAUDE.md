# CLAUDE.md - @ogham/filid

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is filid?

`@ogham/filid`는 **Fractal Context Architecture (FCA-AI)** 규칙을 강제하는 Claude Code 플러그인이다. 4계층 아키텍처로 작동한다:

```
Layer 1 (자동)  → Hooks (SessionStart, PreToolUse, SubagentStart, UserPromptSubmit, SessionEnd)
Layer 2 (도구)  → MCP Server (18개 분석/관리 도구)
Layer 3 (에이전트) → 14개 특화 에이전트 (architect, implementer, QA, review committee 등)
Layer 4 (사용자) → 18개 Skills (/filid:filid-setup, /filid:filid-review 등)
```

## Commands

```bash
yarn build          # clean → version:sync → tsc → esbuild
yarn build:plugin   # esbuild 번들만 (tsc 생략)
yarn typecheck      # 타입 체크 (emit 없음)
yarn test           # watch 모드
yarn test:run       # 단일 실행 (CI)
yarn test:coverage  # 커버리지
yarn bench:run      # 벤치마크
yarn format && yarn lint  # 포맷 + 린트
yarn version:sync   # 버전 동기화 (package.json → src/version.ts)
```

## Build System

1. **TypeScript 컴파일** (`tsconfig.build.json`): `src/` → `dist/` (ESM + `.d.ts`)
2. **esbuild 번들링** (개별 빌드 스크립트):
   - `scripts/build-mcp-server.mjs`: `src/mcp/server-entry.ts` → `bridge/mcp-server.cjs` (CJS)
   - `scripts/build-hooks.mjs`: `src/hooks/entries/*.entry.ts` → `bridge/*.mjs` (ESM, 각 훅)

`dist/`는 라이브러리 export용, `bridge/`는 MCP 서버 + 훅 런타임용, `libs/`는 런타임 유틸리티(`find-node.sh`). 변경 후 `yarn build`로 재생성.

## Architecture

### Core Concepts

- **FractalNode 타입**: `fractal` (INTENT.md 필요), `organ` (INTENT.md 금지), `pure-function`, `hybrid`
- **3-Tier Boundary**: "Always do" / "Ask first" / "Never do" 섹션 필수
- **50-line Limit**: INTENT.md 50줄 이하 (pre-tool-use hook 강제). DETAIL.md는 hard limit 없음 — append-only 금지 및 현재 상태 반영만 요구.
- **3+12 Test Rule**: 핵심 3 + 엣지 12 = 최대 15개 테스트
- **Module Split**: LCOM4 ≥ 2 또는 CC > 15 또는 500줄 초과 → 분리 권장

### Key Source Directories

| 경로            | 역할                                                            |
| --------------- | --------------------------------------------------------------- |
| `src/core/`     | 핵심 로직 (FractalTree, RuleEngine, DriftDetector 등 12개 모듈) |
| `src/ast/`      | `@ast-grep/napi` AST 분석 (LCOM4, CC, 의존성)                   |
| `src/mcp/`      | MCP 서버 + 18개 도구 핸들러                                     |
| `src/hooks/`    | 훅 구현체 + `entries/` (esbuild 진입점)                         |
| `src/metrics/`  | 테스트 밀도, 모듈 분리 결정 메트릭                              |
| `src/compress/` | 컨텍스트 압축 (가역/비가역)                                     |
| `src/types/`    | 타입 정의 (index.ts에서 중앙 export)                            |

### Key Files

- `src/index.ts` — 94개 함수/상수 + 전체 타입 re-export
- `src/core/rule-engine.ts` — 8개 내장 규칙 (naming, structure, dependency, documentation, index, module)
- `src/mcp/server.ts` — MCP 서버 초기화 + 18개 도구 등록
- `src/hooks/context-injector.ts` — UserPromptSubmit 시 최소 FCA-AI 포인터 주입 (규칙은 .claude/rules/filid_fca-policy.md에 위임)
- `src/hooks/session-cleanup.ts` — SessionEnd 시 세션 캐시 파일 정리
- `src/hooks/shared.ts` — 훅 공통 유틸리티 (isFcaProject, isIntentMd, isDetailMd)
- `scripts/build-mcp-server.mjs` — MCP 서버 esbuild 번들러
- `scripts/build-hooks.mjs` — 훅 스크립트 esbuild 번들러

### Plugin Runtime

- `.claude-plugin/plugin.json` — 매니페스트 (name, version, skills, mcp)
- `.mcp.json` — MCP 서버 등록 (`bridge/mcp-server.cjs`)
- `hooks/hooks.json` — 훅 이벤트 매핑 (PreToolUse→Read/Write/Edit, SubagentStart→*, UserPromptSubmit→*, SessionStart→\*, SessionEnd→\*)

### Agents (14)

**Operational (7)**: `fractal-architect`, `qa-reviewer` (읽기 전용) · `implementer`, `restructurer` (구현) · `context-manager` (문서) · `drift-analyzer` (드리프트) · `code-surgeon` (패치)

**Review committee (7)**: `adjudicator` (fast-path 통합 리뷰) · `engineering-architect`, `knowledge-manager`, `operations-sre` (judicial/legislative) · `business-driver` (executive) · `product-manager`, `design-hci` (translator/humanist) — `/filid:filid-review` Phase D 페르소나

### Skills (18)

`filid-review` (다중 페르소나 리뷰), `filid-scan` (위반 스캔), `filid-setup`, `filid-sync`, `filid-structure-review`, `filid-promote`, `filid-restructure`, `filid-resolve`, `filid-revalidate`, `filid-guide`, `filid-context-query`, `filid-update` (문서/테스트 동기화), `filid-enrich-docs` (INTENT.md 품질 감사 및 enrichment), `filid-pull-request` (FCA-aware PR 자동 생성), `filid-pipeline` (PR→리뷰→리졸브→재검증 파이프라인), `filid-migrate` (레거시 CLAUDE.md→INTENT.md 마이그레이션), `filid-ast-fallback` (LLM AST 패턴 매칭), `filid-config` (설정 관리)

## References

`../../.metadata/filid/`: `01-ARCHITECTURE.md` (설계), `06-HOW-IT-WORKS.md` (AST 엔진), `07-RULES-REFERENCE.md` (규칙), `08-API-SURFACE.md` (API)

## Development Notes

- **AST**: `@ast-grep/napi` (tree-sitter) 단일 엔진
- **훅 수정**: `src/hooks/entries/*.entry.ts` 수정 후 `yarn build:plugin`으로 재빌드
- **버전**: `src/version.ts` 직접 수정 금지 → `yarn version:sync` 사용
- **테스트**: `src/**/__tests__/**/*.test.ts`, 벤치마크는 `**/*.bench.ts`

## Anti-Yield Discipline

LLM이 turn을 yield할 수 있는 지점(AskUserQuestion, `[y/N]` 프롬프트, subagent return, 외부 명령 대기 등)이 있는 skill은 중간에 중단될 위험이 있다. Tier 분류는 phase 개수가 아니라 **yield 지점의 유무와 성격**을 기준으로 한다:

- **Tier-1** (파이프라인): `filid-pipeline` — 상단 EXECUTION MODEL preamble + phase-transition inline directives + DO NOT STOP callouts
- **Tier-2a** (다단계 비상호작용): `filid-review`, `filid-revalidate`, `filid-scan`, `filid-structure-review`, `filid-update`, `filid-pull-request`, `filid-promote` — 동일 3-layer
- **Tier-2b** (상호작용 escape hatch): `filid-resolve`, `filid-sync`, `filid-restructure`, `filid-setup`, `filid-enrich-docs` — step-level escape hatch preamble + `<!-- [INTERACTIVE] -->` 마커 (AskUserQuestion/[y/N] 지점). `filid-setup`은 Phase 0c (rule docs 체크박스)에서 사용자 응답 대기. `filid-enrich-docs`는 Stage 5 (approval gate)에서 `--auto-approve` 없을 때 대기.
- **Tier-3** (yield 지점 없음): `filid-config`, `filid-guide`, `filid-context-query`, `filid-ast-fallback`, `filid-migrate` — 내부 Phase 개수와 무관하게 AskUserQuestion·interactive gate가 없어 LLM이 turn을 끊을 지점 자체가 존재하지 않는 스킬. preamble 추가 금지 (과잉 체이닝 유발).

신규 skill 추가 시 Tier-1/2a/2b에 해당하면 `packages/filid/skills/filid-pipeline/SKILL.md:11-24`의 3-layer 패턴을 복제할 것. Terminal stage marker는 `.omc/research/terminal-markers.json`에 등록.

