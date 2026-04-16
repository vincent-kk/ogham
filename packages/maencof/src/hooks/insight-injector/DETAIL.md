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

## Cross-event handoff invariant (G5)

이 훅은 `pending-insight-notification.json` 을 읽지도 쓰지도 삭제하지도 않는다.
해당 파일의 수명 주기는 다음과 같다:

1. **Turn N, `capture_insight` MCP call** → `pending-insight-notification.json` 에 append.
2. **Turn N+1 이후 첫 SessionStart** → `session-start.ts` 가 읽어 Claude 에게
   surface 하고 파일을 삭제한다.
3. **Turn N 과 consumption 사이에 크래시** → 파일은 디스크에 남으며, 다음 세션의
   SessionStart 가 다시 pick up 한다. TTL 없음; one-shot + self-cleaning.

`insight-injector` 는 `config.category_filter` 에서 `allowed-categories` 만 읽어
배너에 투영할 뿐, 위 파이프라인과는 독립적이다. 이 분리가 깨지면 (예: 인젝터가
pending 파일을 읽거나 삭제) SessionStart 소비자와 레이스 컨디션이 생기므로 절대
도입하지 말 것.

## Last Updated

2026-04-16 (PR γ — G5 cross-event handoff invariant 문서화)
