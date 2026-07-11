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

- 지원 이벤트 전부 context-capable:
  `{ continue: true, hookSpecificOutput: { hookEventName, additionalContext } }` — Claude 가 메시지를 직접 읽을 수 있음.
- Top-level `message`, `hookMessage` 필드는 어떤 이벤트에서도 방출되지 않는다 (Claude Code 가 조용히 버리는 필드).
