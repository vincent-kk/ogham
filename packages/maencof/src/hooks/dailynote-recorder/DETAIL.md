# dailynote-recorder — DETAIL

## Requirements

- PostToolUse 이벤트에서 `TOOL_CATEGORY_MAP` 에 매핑된 도구 호출에 한해 오늘자 dailynote (`.maencof-meta/dailynotes/<YYYY-MM-DD>.md`) 에 한 줄을 append 한다.
- `tool_input` 또는 `tool_response` 에서 영향 경로를 추출해 `path` 필드에 기록한다.
- **Exclusion (P4)**: 아래 prefix 로 시작하는 경로는 기록을 skip 한다. 이 경로들의 write 는 maencof 자체 관리 작업이므로 기록하면 append 가 또 다른 write 이벤트를 유발해 무한 복제 / self-reference 가 발생한다.

## API Contracts

### Input / Output

```ts
interface DailynoteRecorderInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  cwd?: string;
  session_id?: string;
}

interface DailynoteRecorderResult {
  continue: boolean; // 항상 true (graceful degradation)
}
```

### Exclusion path prefixes

Recorder 는 path 가 다음 prefix 중 하나로 시작하면 skip 한다:

- `02_Derived/changelog/` — changelog 문서 (매 세션 말미에 생성)
- `02_Derived/dailynotes/` — dailynote 파일 자체
- `.maencof/` — 그래프 인덱스, stale-nodes 등
- `.maencof-meta/` — 운영 메타데이터 (session, config 등)

### Graceful degradation

- vault 가 아니면 즉시 `{ continue: true }` 반환.
- `tool_name` 이 `TOOL_CATEGORY_MAP` 에 없으면 skip.
- 어떤 오류도 error-log 에 기록 후 `{ continue: true }` 로 회복.

### Intentional tool omissions (Y4 / Y5 — documented, not a bug)

다음 MCP 도구들은 `hooks.json` 의 PostToolUse matcher 와 `TOOL_CATEGORY_MAP`
어디에도 포함되지 않는다. 이는 의도적인 설계 결정이며 버그가 아니다:

- **`kg_build`** (Y4): 내부 유지보수 연산. 사용자가 직접 호출할 일이 드물고,
  실행될 때마다 dailynote 에 한 줄씩 추가되면 실제 지식 이벤트 신호 대비 노이즈가
  커지므로 의도적으로 matcher 에서 제외한다. `maencof-changelog` 는 별도로 rebuild
  추적을 담당한다.
- **`context_cache_manage`** (Y5): pin/unpin/refresh 는 휘발성 캐시 작업으로,
  벌트 상태 변화가 아니다. 기록해도 "해당 턴에 무슨 지식 작업이 있었는가" 라는
  dailynote 의 본래 목적과 무관하므로 제외한다.

위 두 도구를 기록 대상에 추가하려면 (a) `TOOL_CATEGORY_MAP` 에 카테고리를 추가하고
(b) `hooks.json` PostToolUse matcher 에 도구명을 추가한 뒤 (c) 이 문서의
"Intentional tool omissions" 섹션을 제거해야 한다.

## Last Updated

2026-04-16 (PR α — P4 self-reference exclusion + Y4/Y5 omission rationale)
