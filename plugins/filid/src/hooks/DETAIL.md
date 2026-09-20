# hooks contract

## Requirements

- SessionStart 초기화, UserPromptSubmit 컨텍스트 주입, PreToolUse 검증·주입·가드를 각각 독립 sub-fractal로 구현한다.
- 엔트리 파일(`*.entry.ts`)은 로직을 담지 않는다. stdin 수집 → 핸들러 → stdout이 전부다.
- **훅 도달 코드는 배럴을 import하지 않는다.** 배럴을 거치면 번들러가 배럴이 재노출하는 모듈 전체를 끌어온다. 각 소유 프랙탈의 `## Boundary Exemptions` 선언이 이 직접 참조를 명시한다.
- 어떤 훅도 세션을 중단시키지 않는다. 차단은 PreToolUse의 `permissionDecision: 'deny'`로 해당 도구 호출 하나만 막는다.
- structure-guard가 도구 호출을 막지 않고 `additionalContext`로 싣는 경고·안내 문장과 모든 deny 사유 문장은 호출자가 다음에 무엇을 해야 하는지까지 담는다: 경고인 `checkOrganSubdirectory`는 organ에 파일을 그대로 두거나 새 fractal로 만들라고, 경고인 `checkCircularImports`는 concrete 모듈을 직접 import하거나 공유 코드를 옮기라고, 안내인 `checkIntentMdReclassification`은 DETAIL.md와 entry point로 fractal을 완성하거나 INTENT.md를 지우라고 말한다. deny 사유는 저마다 무엇을 어떻게 바꿔 다시 낼지 말하고, 끝에 붙는 `DENY_RETRY_GUIDANCE`(`constants/hookDefaults.ts`)는 반복 방지 종료를 말한다: 같은 거부가 다시 나오면 호출을 재제출하지 않고, 그 쓰기를 건너뛴 사실을 보고서에 filid 결함으로 기록한 뒤 나머지 일을 계속한다. 사람을 부르지 않는다. `mergeResults`가 특정 사유 없이 deny할 때 쓰는 `GENERIC_DENY_REASON`도 같은 종료를 말한다. `setup.ts`의 catch 문장은 바꾸지 않는다 — 실패 원인(cache 디렉터리, prune)을 호출자가 고칠 수 없고 비-FCA 세션에도 주입되어 잡음이 되기 때문이다.

## API Contracts

- `processSetup`, `handleUserPromptSubmit`, `handlePreToolUse` — 각 이벤트 입력을 받아 `HookOutput`을 반환한다.

## Acceptance Criteria

### AC-hooks-lifecycles — 세 이벤트

- SessionStart, UserPromptSubmit, PreToolUse 세 진입점만 존재하며 SubagentStart와 PostToolUse 훅은 없다.

### AC-hooks-bundle-isolation — 번들 격리

- 훅 도달 코드가 배럴을 import하지 않으며 빌드 바이트 캡을 통과한다.

## Last Updated

2026-07-28 — 중간 계층 fractal 계약을 문서화했다.
