# structureGuard contract

## Requirements

- `Write`/`Edit` 도구 호출에서만 동작한다. 다른 `tool_name`은 즉시 통과한다.
- 세 가지 구조 위험을 경고한다: INTENT.md 생성으로 organ이 fractal로 재분류되는 경우, organ 하위의 새 디렉터리 생성, import 구문이 만드는 순환 의존.
- **어떤 경우에도 차단하지 않는다.** `[filid:info]` / `[filid:warn]` 텍스트만 주입한다. 차단은 `preToolValidator`의 문서 gate가 소유한다.
- 검사 로직은 `../../utils/` organ에 위임하고 이 모듈은 조합만 한다.

## API Contracts

- `guardStructure(input: PreToolUseInput): HookOutput` — 경고 텍스트를 담은 훅 출력. 위험이 없으면 추가 컨텍스트 없이 통과한다.

## Acceptance Criteria

### AC-guard-nonblocking — 경고만 하고 막지 않는다

- 세 위험이 모두 감지되어도 `permissionDecision`을 설정하지 않는다.

### AC-guard-scope — 대상 도구 한정

- `Write`/`Edit`이 아닌 입력은 검사 없이 통과한다.

### AC-guard-declared-organ — 선언된 organ만 flatness 경고

- 문서도 module index도 없는 임의 디렉터리는 경고 대상이 아니다. known organ 이름이나 `__name__`/`.name` 패턴으로 선언된 organ만 경고를 받는다.

## Boundary Exemptions

### structureGuard.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

2026-07-28 — 훅 번들 직접 참조 면책을 선언하고 계약을 문서화했다.
