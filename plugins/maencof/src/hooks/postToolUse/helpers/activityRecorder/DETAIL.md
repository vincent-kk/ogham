# activityRecorder — DETAIL

## Requirements

- PostToolUse 이벤트에서 `TOOL_CATEGORY_MAP` 에 매핑된 도구 호출에 한해 오늘자 활동 로그
  (`.maencof-meta/activity/events/<YYYY-MM-DD>.jsonl`) 에 한 줄(JSON)을 append 한다.
- `tool_input` 또는 `tool_response` 에서 영향 경로를 추출해 `path` 필드에 기록한다.
- **Exclusion (P4)**: 아래 prefix 로 시작하는 경로는 기록을 skip 한다. 이 경로들의 write 는
  maencof 자체 관리 작업이므로 기록하면 append 가 또 다른 write 이벤트를 유발해 무한 복제 /
  self-reference 가 발생한다.

## API Contracts

### Input / Output

```ts
interface ActivityRecorderInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  cwd?: string;
  session_id?: string;
}

interface ActivityRecorderResult {
  continue: boolean; // 항상 true (graceful degradation)
}
```

### Exclusion path prefixes

path 가 다음 prefix 중 하나로 시작하면 skip 한다:

- `02_Derived/changelog/` — changelog 문서
- `02_Derived/dailynotes/` — 볼트 측 파생 노트
- `.maencof/` — 그래프 인덱스, stale-nodes 등
- `.maencof-meta/` — 운영 메타데이터 (활동 로그·세션·digest·config 등)

### Graceful degradation

- vault 가 아니면 즉시 `{ continue: true }` 반환.
- `tool_name` 이 `TOOL_CATEGORY_MAP` 에 없으면 skip.
- 어떤 오류도 errorLog 에 기록 후 `{ continue: true }` 로 회복.

### Intentional tool omissions (documented, not a bug)

다음 MCP 도구들은 `hooks.json` 의 PostToolUse matcher 에 포함되지 않는다 (의도적 설계):

- **`kg_build`**: 내부 유지보수 연산. 매 실행마다 기록하면 실제 지식 이벤트 대비 노이즈가
  커지므로 matcher 에서 제외. (`TOOL_CATEGORY_MAP` 에는 향후 opt-in 대비 등록만 돼 있음.)
- **`context_cache_manage`**: pin/unpin/refresh 는 휘발성 캐시 작업으로 볼트 상태 변화가
  아니므로 제외.

추가하려면 (a) `TOOL_CATEGORY_MAP` 에 카테고리 추가, (b) `hooks.json` matcher 에 도구명 추가,
(c) 이 섹션 갱신.
