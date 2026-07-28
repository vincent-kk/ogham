# hooks contract

## Requirements

- SessionStart 초기화, UserPromptSubmit 컨텍스트 주입, PreToolUse
  검증·주입·가드를 각각 독립 sub-fractal로 구현한다.
- 엔트리 파일(`*.entry.ts`)은 로직을 담지 않는다. stdin 수집 → 핸들러 →
  stdout이 전부다.
- **훅 도달 코드는 배럴을 import하지 않는다.** 배럴을 거치면 번들러가 배럴이
  재노출하는 모듈 전체를 끌어온다. 각 소유 프랙탈의 `## Boundary Exemptions`
  선언이 이 직접 참조를 명시한다.
- 어떤 훅도 세션을 중단시키지 않는다. 차단은 PreToolUse의
  `permissionDecision: 'deny'`로 해당 도구 호출 하나만 막는다.

## API Contracts

- `processSetup`, `processUserPromptSubmit`, `processPreToolUse` — 각
  이벤트 입력을 받아 `HookOutput`을 반환한다.

## Acceptance Criteria

### AC-hooks-lifecycles — 세 이벤트

- SessionStart, UserPromptSubmit, PreToolUse 세 진입점만 존재하며
  SubagentStart와 PostToolUse 훅은 없다.

### AC-hooks-bundle-isolation — 번들 격리

- 훅 도달 코드가 배럴을 import하지 않으며 빌드 바이트 캡을 통과한다.

## Last Updated

2026-07-28 — 중간 계층 fractal 계약을 문서화했다.
