# lifecycleDispatcher — DETAIL

## Requirements

- vault lifecycle configuration의 `actions` 중 현재 이벤트·도구에 매칭되는 항목들을 실행하고, 결과 문자열을 하나로 합쳐 Claude Code 이벤트별 올바른 envelope 에 담아 반환한다.
- 매칭 액션이 없거나 vault 가 아닌 경우 `{ continue: true }` 만 반환해야 하며, `message` / `hookMessage` 같은 미지원 필드는 절대 방출하지 않는다.
- PreToolUse와 PostToolUse는 같은 host-neutral matcher 해석기를 사용한다. physical `apply_patch`만 logical `Edit`으로 정규화하고 `Edit`·`Bash`·MCP 이름 등 나머지는 그대로 비교한다.
- matcher 양쪽과 관측 tool 이름을 같은 방식으로 정규화한다. 판단은 `tool_name`에만 의존하며 성공·실패 `tool_response` 형태를 읽지 않는다.

## API Contracts

### Input (stdin)

```ts
interface LifecycleDispatcherInput {
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
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

### AC-host-neutral-tool-matcher — Pre/Post 공통 도구 어휘

- 같은 `Edit` action이 Claude `Edit`와 Codex `apply_patch` Pre/Post에서 각각 한 번 실행된다.
- `Bash`, MCP 도구명, 불일치 이름은 별칭 부작용 없이 identity 비교한다.

### AC-response-independent-match — response 비의존 판정

- 같은 event와 tool name은 성공·실패·문자열·객체 response 형태와 무관하게 같은 matcher 결과를 낸다.

## Boundary Exemptions

### `lifecycleDispatcher.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 네 훅 전부가 이 디스패처를 호출하므로 배럴을 거치면 네 번들 모두가 재노출 그래프를 함께 싣게 되고, `post-tool-use`·`pre-tool-use` 의 12288 바이트 캡이 먼저 깨진다.

## Last Updated

2026-08-23 — Pre/Post 공통 logical tool matcher와 response 비의존 판정을 계약화했다.
