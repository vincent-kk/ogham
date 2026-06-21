# workHistory DETAIL

## Requirements

- `work_history` MCP 도구는 daily digest(`activity/digests/daily/YYYY-MM-DD.json`)를
  집계하여 "그동안 무슨 작업을 했나"에 답한다. 읽기 전용(`needsFreshness: false`).
- 모드 우선순위: `topic` → `layer` → 기간 요약(period). `topic`/`layer` 가 있으면
  역색인 기반 작업일자 이력(lookup)을, 없으면 daily digest 합산(period)을 반환한다.
- 기간 결정: `from`+`to` 가 모두 주어지면 그 범위, 아니면 오늘 기준 `last_days` 윈도우
  (기본 7, 1-90 clamp).
- 모든 로직은 `core/workIndex` 에 위임한다 (이 도구는 입력 검증 + 모드 분기만 수행).

## API Contracts

### Input (`WorkHistoryReadInput`)

| Field       | Type     | Required | Notes                                          |
| ----------- | -------- | -------- | ---------------------------------------------- |
| `last_days` | `number` | no       | 정수 1-90, 기본 7 (period 모드)                |
| `from`      | `string` | no       | `^\d{4}-\d{2}-\d{2}$`, `to` 와 함께 사용       |
| `to`        | `string` | no       | `^\d{4}-\d{2}-\d{2}$`                          |
| `topic`     | `string` | no       | 토픽(파일명 stem) 작업일자 이력 조회           |
| `layer`     | `string` | no       | 레이어 디렉터리(예: `01_Core`) 작업일자 조회   |

### Output (`WorkHistoryReadResult`)

`period` 또는 `lookup` 중 하나만 채워진다.

```ts
{
  period?: {
    from: string; to: string;
    activeDays: number;        // 활동이 있었던 일수
    sessionCount: number;
    totalDurationMin: number;  // 마감 세션 (endedAt-startedAt) 합
    vaultOps: Record<string, number>;
    topTopics: { topic: string; days: number }[]; // 작업일수 상위
    layers: string[];
  };
  lookup?: {
    kind: 'topic' | 'layer';
    key: string;
    lastWorkedOn: string | null; // 가장 최근 작업일, 없으면 null
    dates: string[];             // 작업일자 내림차순
  };
}
```

### LLM Rendering Convention

자연어 프롬프트("그동안 뭐 했지", "01_Core 마지막 작업 언제")로 호출되므로 LLM이
결과를 간결한 요약으로 렌더한다.

- **period**: `from~to` 범위에서 활동일 `activeDays`일 / 세션 `sessionCount`회 /
  누적 `totalDurationMin`분, 상위 토픽(`topTopics`)·레이어(`layers`)·`vaultOps` 요약.
- **lookup**: `key` 를 마지막으로 작업한 날(`lastWorkedOn`)과 전체 작업일자 목록(`dates`).

### Empty Result

- period: `activeDays === 0` (해당 기간 digest 없음) → "기간 내 기록된 작업 없음".
- lookup: `dates === []` (`lastWorkedOn === null`) → "해당 토픽/레이어 작업 이력 없음".
