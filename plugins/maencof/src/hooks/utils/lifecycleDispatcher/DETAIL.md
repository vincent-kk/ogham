# lifecycleDispatcher — DETAIL

## Requirements

- `.maencof-meta/lifecycle.json` 파일의 `actions[]` 중 현재 이벤트·도구에 매칭되는 항목들을 실행하고, 결과 문자열을 하나로 합쳐 Claude Code 이벤트별 올바른 envelope 에 담아 반환한다.
- 매칭 액션이 없거나 vault 가 아닌 경우 `{ continue: true }` 만 반환해야 하며, `message` / `hookMessage` 같은 미지원 필드는 절대 방출하지 않는다.

## API Contracts

### Input (stdin)

```ts
interface LifecycleDispatcherInput {
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
}
```

### CLI argument

- 첫 번째 arg 는 `LifecycleEvent` (`SessionStart` | `UserPromptSubmit` | `PreToolUse` | `PostToolUse`). 그 외 값(은퇴한 `Stop`·`SessionEnd` 포함)은 silently `{ continue: true }` 반환 — 기존 lifecycle.json 에 남은 SessionEnd 액션은 무시된다.

### Output envelope (`LifecycleDispatchResult`)

- 지원 이벤트 전부 context-capable: `{ continue: true, hookSpecificOutput: { hookEventName, additionalContext } }` — Claude 가 메시지를 직접 읽을 수 있음.
- Top-level `message`, `hookMessage` 필드는 어떤 이벤트에서도 방출되지 않는다 (Claude Code 가 조용히 버리는 필드).

### Entry point

- `runLifecycleDispatcher(event, input)` — 위 입력을 받아 envelope 을 반환한다.

## Acceptance Criteria

### AC-no-match-continue — 무매칭 통과

- 매칭 액션이 없거나 볼트가 아니면 `{ continue: true }` 만 반환한다.

### AC-retired-event-silent — 은퇴 이벤트 무음

- `Stop`·`SessionEnd` 같은 미지원 이벤트 인자에서 오류 없이 `{ continue: true }` 를 반환한다.

### AC-no-unsupported-fields — 미지원 필드 부재

- 출력에 top-level `message`·`hookMessage` 가 없다.

## Boundary Exemptions

### `lifecycleDispatcher.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 네 훅 전부가 이 디스패처를 호출하므로 배럴을 거치면 네 번들 모두가 재노출 그래프를 함께 싣게 되고, `post-tool-use`·`pre-tool-use` 의 12288 바이트 캡이 먼저 깨진다.

## Last Updated

2026-07-30 — 진입점·acceptance group 을 채우고 훅 직접 import 면책을 선언했다.
