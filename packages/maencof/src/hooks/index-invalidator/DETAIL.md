# index-invalidator — DETAIL

## Requirements

- PostToolUse 이벤트 중 maencof MCP CRUD 도구 (`MAENCOF_MCP_TOOLS` 세트) 호출 후에만 동작한다.
- 영향받은 노드 경로를 `.maencof/stale-nodes.json` 에 append (중복 제거) 하고 `.maencof-meta/usage-stats.json` 의 해당 도구 카운터를 1 증가시킨다.
- `move` 도구는 source + target 양쪽을 모두 stale 로 기록한다.
- stale / total 비율에 따라 advisory 메시지를 생성한다 (≥15% rebuild 권고, 10-15% soft advisory, 그 외 suppress).

## API Contracts

### Input (stdin)

```ts
interface PostToolUseInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  cwd?: string;
}
```

### Output envelope

```ts
interface PostToolUseResult {
  continue: boolean;
  hookSpecificOutput?: {
    hookEventName: 'PostToolUse';
    additionalContext: string;
  };
}
```

- vault 아님 / 비-maencof 도구 → `{ continue: true }` 만 반환, I/O 없음.
- advisory suppress 조건 충족 → `hookSpecificOutput` 생략.
- advisory 존재 → `additionalContext` 에 배치 (Claude 가시). Top-level `hookMessage` / `message` 방출 금지.

### Stale-nodes file schema

```json
{
  "paths": ["02_Derived/a.md", "02_Derived/b.md"],
  "updatedAt": "<ISO8601>"
}
```

- 중복 경로는 join 전 dedup.
- 파일 생성 실패·JSON 파싱 실패 시 error-log 에 기록 후 빈 배열부터 재시작.

## Last Updated

2026-04-16 (PR α — P1 hook schema fix)
