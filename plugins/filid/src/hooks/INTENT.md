# hooks -- Claude Code 훅 계층

## Purpose

Claude Code의 SessionStart 초기화·UserPromptSubmit 컨텍스트 주입·PreToolUse 검증/주입/가드를 독립 sub-fractal로 구현한다. 엔트리 파일(`*.entry.ts`)은 공식 hook 빌드가 `bridge/*.mjs`로 번들링한다.

## Structure

| 모듈               | 이벤트            | 역할                                        |
| ------------------ | ----------------- | ------------------------------------------- |
| `setup`            | SessionStart      | 캐시 초기화 + INTENT.md 자동 감지 + pruning |
| `userPromptSubmit` | UserPromptSubmit  | 턴당 fmap reset + 세션 첫 FCA 포인터        |
| `intentInjector`   | PreToolUse (내부) | INTENT.md 체인·map 주입                     |
| `preToolValidator` | PreToolUse (내부) | INTENT/DETAIL write gate                    |
| `structureGuard`   | PreToolUse (내부) | 재분류/organ subdir/순환 import 경고        |
| `preToolUse`       | PreToolUse        | 위 3개 서브모듈 오케스트레이션              |
| `shared` organ     | -                 | `isFcaProject`/`isIntentMd`/`isDetailMd`    |
| `utils` organ      | -                 | `validateCwd`, organ 구조 검사 등           |

## Conventions

- 모든 훅은 `validateCwd`를 최우선 호출 (payload cwd 보안 가드)
- `preToolValidator`는 위반 시 `permissionDecision: 'deny'`로 해당 도구 호출만 차단 (턴 비중단)
- 엔트리 파일(`*.entry.ts`)은 stdin→핸들러→stdout 파이프만 — 로직 금지
- 수정 후 `yarn build:hooks`로 `bridge/*.mjs` 재생성 필수

## Boundaries

### Always do

- 새 훅 추가 시 canonical `hooks/hooks.json`, build entry, 공개 entry point를 함께 갱신
- setup/user-prompt-submit/pre-tool-use와 공용 runner만 배포

### Ask first

- 기존 훅 이벤트 타입 변경 (Claude Code 호환성)

### Never do

- entry 파일에 비즈니스 로직 추가
- 훅 내부에서 `.claude/rules/` write (setup 스킬 전담)
- 제거된 agent 역할 또는 spike/criteria 정책을 hook 경계에 재도입

## Dependencies

- `../core/`, `../lib/logger.js`, `../constants/`, `../types/hooks.js`
