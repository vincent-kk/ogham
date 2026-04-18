# hooks -- Claude Code 훅 계층

## Purpose

Claude Code 플러그인 훅 이벤트를 처리하는 fractal. SessionStart 초기화·UserPromptSubmit 컨텍스트 주입·PreToolUse 검증/주입/가드·SubagentStart 역할 강제·PostToolUse 변경 추적·SessionEnd 정리를 각각 독립 sub-fractal로 구현한다. 엔트리 파일(`*.entry.ts`)은 esbuild가 `bridge/*.mjs`로 번들링.

## Structure

| 모듈 | 이벤트 | 역할 |
|------|--------|------|
| `setup` | SessionStart | 캐시 초기화 + INTENT.md 자동 감지 + pruning |
| `user-prompt-submit` | UserPromptSubmit | 턴당 fmap reset + 세션 첫 프롬프트 FCA 포인터 주입 |
| `intent-injector` | PreToolUse (내부) | INTENT.md 체인·map 주입 |
| `pre-tool-validator` | PreToolUse (내부) | INTENT.md 50줄·DETAIL.md append-only 블록 |
| `structure-guard` | PreToolUse (내부) | 재분류/organ subdir/순환 import 경고 |
| `pre-tool-use` | PreToolUse | 위 3개 서브모듈 오케스트레이션 |
| `agent-enforcer` | SubagentStart | 에이전트 역할·언어 태그 주입 |
| `change-tracker` | PostToolUse | 변경 추적 (현재 비활성) |
| `session-cleanup` | SessionEnd | 세션 캐시 파일 정리 |
| `shared` organ | - | `isFcaProject`/`isIntentMd`/`isDetailMd` |
| `utils` organ | - | `validateCwd`, organ 구조 검사, 순환 감지 등 |

## Conventions

- 모든 훅은 `validateCwd`를 최우선 호출 (payload cwd 보안 가드)
- `continue: false`는 오직 `pre-tool-validator`의 명시적 블록 시에만 허용
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
