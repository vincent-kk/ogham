# hooks -- Claude Code 훅 계층

## Purpose

Claude Code 플러그인 훅 이벤트를 처리하는 fractal. SessionStart 초기화·UserPromptSubmit 컨텍스트 주입·PreToolUse 검증/주입/가드·SubagentStart 역할 강제·PostToolUse 변경 추적을 각각 독립 sub-fractal로 구현한다. 세션 캐시 정리는 MCP 서버 수명주기(`src/mcp/server/bootSweep.ts`·`registerShutdown.ts`) 소관. 엔트리 파일(`*.entry.ts`)은 esbuild가 `bridge/*.mjs`로 번들링.

## Structure

| 모듈               | 이벤트            | 역할                                                                          |
| ------------------ | ----------------- | ----------------------------------------------------------------------------- |
| `setup`            | SessionStart      | 캐시 초기화 + INTENT.md 자동 감지 + pruning                                   |
| `userPromptSubmit` | UserPromptSubmit  | 턴당 fmap reset + 세션 첫 FCA 포인터 + spike 배너(매 프롬프트)                |
| `intentInjector`   | PreToolUse (내부) | INTENT.md 체인·map 주입                                                       |
| `preToolValidator` | PreToolUse (내부) | INTENT/DETAIL 위생·criteria 원장 블록 (spike 면제 게이트)                     |
| `structureGuard`   | PreToolUse (내부) | 재분류/organ subdir/순환 import 경고                                          |
| `preToolUse`       | PreToolUse        | 위 3개 서브모듈 오케스트레이션                                                |
| `agentEnforcer`    | SubagentStart     | 에이전트 역할·언어 태그 주입                                                  |
| `changeTracker`    | PostToolUse       | 변경 추적 (현재 비활성)                                                       |
| `shared` organ     | -                 | `isFcaProject`/`isIntentMd`/`isDetailMd`/`isCriteriaMd`                       |
| `utils` organ      | -                 | `validateCwd`, git 메타 판독(branch/HEAD/reflog/manifest), organ 구조 검사 등 |

## Conventions

- 모든 훅은 `validateCwd`를 최우선 호출 (payload cwd 보안 가드)
- `preToolValidator`는 위반 시 `permissionDecision: 'deny'`로 해당 도구 호출만 차단 (턴 비중단)
- 엔트리 파일(`*.entry.ts`)은 stdin→핸들러→stdout 파이프만 — 로직 금지
- 수정 후 `yarn build:plugin`으로 `bridge/*.mjs` 재생성 필수

## Boundaries

### Always do

- 새 훅 추가 시 `hooks.json` 이벤트 매핑 + `src/index.ts` export 동시 갱신

### Ask first

- 기존 훅 이벤트 타입 변경 (Claude Code 호환성)

### Never do

- entry 파일에 비즈니스 로직 추가
- 훅 내부에서 `.claude/rules/` write (setup 스킬 전담)

## Dependencies

- `../core/`, `../lib/logger.js`, `../constants/`, `../types/hooks.js`
