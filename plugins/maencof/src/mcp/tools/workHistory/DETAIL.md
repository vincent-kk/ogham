# workHistory DETAIL

## Requirements

- daily digest를 읽어 작업 이력을 설명한다. digest 생성과 세션 마감은 workIndex가 소유하며 이 도구는 쓰지 않는다.
- 토픽·레이어 이력 조회와 기간 요약을 구별한다. 분기와 기간 기본값은 구현·테스트에서 읽고, 사용자에게 보여 줄 요약은 아래 렌더링 규칙을 따른다.

## API Contracts

### LLM Rendering Convention

자연어 프롬프트("그동안 뭐 했지", "01_Core 마지막 작업 언제")로 호출되므로 LLM이 결과를 간결한 요약으로 렌더한다.

- **period**: `from~to` 범위에서 활동일 `activeDays`일 / 세션 `sessionCount`회 / 누적 `totalDurationMin`분, 상위 토픽(`topTopics`)·레이어(`layers`)·`vaultOps` 요약.
- **lookup**: `key` 를 마지막으로 작업한 날(`lastWorkedOn`)과 전체 작업일자 목록(`dates`).

### Empty Result

- period: `activeDays === 0` (해당 기간 digest 없음) → "기간 내 기록된 작업 없음".
- lookup: `dates === []` (`lastWorkedOn === null`) → "해당 토픽/레이어 작업 이력 없음".

## Acceptance Criteria

기간·토픽·레이어 조회의 결과는 workHistoryRead 테스트가 고정하며 자연어 렌더링 규칙은 API Contracts를 따른다.

## Last Updated

digest 읽기와 생성의 책임 분리 또는 기간·토픽·레이어 이력의 LLM 렌더링 규약이 바뀔 때 갱신한다.
