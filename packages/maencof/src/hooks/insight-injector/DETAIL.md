# insight-injector — DETAIL

## Requirements

- UserPromptSubmit 이벤트마다 auto-insight 캡처 시스템의 상태 배너(`<auto-insight …/>`)를 생성해 Claude 에게 노출한다.
- enabled 플래그와 세션당 최대 캡처 수(max) 설정을 준수하며, max 에 도달한 세션에서는 `status="limit-reached"` 배너를 발행한다.
- **이 훅은 캡처 자체를 수행하지 않는다.** `category_filter` 의 실제 차단은 capture-time 에 `capture_insight` MCP 도구에서 일어난다 (P3 재진단). 인젝터는 `allowed-categories` 목록을 배너로 표면화할 뿐이다.

## API Contracts

### Input (stdin)

```ts
interface InsightInjectorInput {
  session_id?: string;
  cwd?: string;
  prompt?: string;
}
```

### Output envelope

```ts
interface InsightInjectorResult {
  continue: boolean;
  hookSpecificOutput?: {
    hookEventName: 'UserPromptSubmit';
    additionalContext: string;
  };
}
```

- vault 아님 / disabled / `cwd` 누락 → `{ continue: true }`.
- 이외 경우 `hookSpecificOutput.additionalContext` 에 `<auto-insight status="active|limit-reached" …/>` 배너 포함.
- Top-level `hookMessage` / `message` 방출 금지 (Claude Code spec 미지원 키).

### Banner attributes

- `status`: `active` | `limit-reached`
- `sensitivity`: `high` | `medium` | `low` (active 일 때)
- `captured`: `"<n>/<max>"`
- `allowed-categories`: `config.category_filter` 의 true 키들만 콤마 구분 (active 일 때). 이 값은 정보 표시용이며 차단 동작은 capture-time 에서 수행됨.

## Last Updated

2026-04-16 (PR α — P1 hook schema fix + P3 surface-only role 명시)
