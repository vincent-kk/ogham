# activityRead DETAIL

## Requirements

- `activity_read` MCP 도구는 `.maencof-meta/activity/events/YYYY-MM-DD.jsonl`(NDJSON)을
  읽어 날짜별 엔트리 목록을 반환한다.
- 입력: `date?` (YYYY-MM-DD) / `category?` (enum) / `last_days?` (1-30, 기본 1).
- `date` 지정 시 해당 날짜만 조회; 미지정 시 오늘부터 N일 최신순.
- 파일 부재 시 해당 날짜는 결과에서 제외(단일 date 조회는 빈 notes).
- 카테고리 필터는 `entries.filter(e => e.category === category)`로 적용.

## API Contracts

### Input (`ActivityReadInput`)

| Field       | Type               | Required | Notes                                             |
| ----------- | ------------------ | -------- | ------------------------------------------------- |
| `date`      | `string`           | no       | `^\d{4}-\d{2}-\d{2}$`, 기본 오늘                  |
| `category`  | `ActivityCategory` | no       | `document`/`search`/`index`/`config`/`diagnostic` |
| `last_days` | `number`           | no       | 정수 1-30, 기본 1                                 |

### Output (`ActivityReadResult`)

```ts
{
  notes: Array<{
    date: string; // YYYY-MM-DD
    entries: ActivityEntry[]; // 필터 적용 후
    entry_count: number;
  }>;
  total_entries: number; // 전체 합
}
```

`ActivityEntry`: `{ time: "HH:MM", category, description, path? }`.

### LLM Rendering Convention

자연어 프롬프트(예: "오늘 maencof 활동 보여줘")로 직접 호출되므로 LLM이
다음 형식으로 렌더한다.

```markdown
## Activity — 2026-06-21

| Time  | Category | Activity              | Path           |
| ----- | -------- | --------------------- | -------------- |
| 09:16 | document | Document created (L2) | 02_Derived/... |
| 10:30 | config   | CLAUDE.md merged      | —              |

> Total: 2 activities recorded.
```

- 날짜별로 `## Activity — {date}` 헤더를 반복.
- `path` 미존재 시 `—` 표기.
- 날짜 정렬: 최신(가장 최근) 먼저. 같은 날 엔트리는 append 순(시간순).
- 전체 엔트리 수(`total_entries`)가 0이면 표 대신 `No activity recorded for the given date.` 문장만 출력.

### Category Enum

| Category     | 의미        | 대응 MCP 도구 예시                                                           |
| ------------ | ----------- | ---------------------------------------------------------------------------- |
| `document`   | 문서 CRUD   | `create`/`read`/`update`/`delete`/`move`/`capture_insight`/`boundary_create` |
| `search`     | 검색/탐색   | `kg_search`/`kg_navigate`/`kg_context`/`kg_suggest_links`                    |
| `index`      | 인덱스 작업 | `kg_build`/`kg_status`                                                       |
| `config`     | 설정 변경   | `claudemd_merge`/`claudemd_read`/`claudemd_remove`                           |
| `diagnostic` | 진단/오류   | 예약됨, 미래 확장                                                            |

### Error Handling

- 파일 부재 시 throw 없이 빈 결과 반환 (읽기 전용 도구 원칙).
- 라인 파싱 실패 시 해당 라인만 건너뛰고 나머지는 정상 반환(NDJSON 복원력).
