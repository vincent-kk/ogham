# lifecycle-dispatcher — DETAIL

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

- 첫 번째 arg 는 `LifecycleEvent` (`SessionStart` | `UserPromptSubmit` | `PreToolUse` | `PostToolUse` | `Stop` | `SessionEnd`). 그 외 값은 silently `{ continue: true }` 반환.

### Output envelope (`LifecycleDispatchResult`)

- Context-capable events (`SessionStart` / `UserPromptSubmit` / `PreToolUse` / `PostToolUse`):
  `{ continue: true, hookSpecificOutput: { hookEventName, additionalContext } }` — Claude 가 메시지를 직접 읽을 수 있음.
- Terminal events (`Stop` / `SessionEnd`): `{ continue: true, systemMessage }` — 사용자에게만 경고로 노출됨 (Claude 미가시).
- Top-level `message`, `hookMessage` 필드는 어떤 이벤트에서도 방출되지 않는다. 자세한 스키마 근거는 `.omc/research/maencof-v030-hook-schema.md` 참조.

## Last Updated

2026-04-16 (PR α — P1 hook output schema fix)
