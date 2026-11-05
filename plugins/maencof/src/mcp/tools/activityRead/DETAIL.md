# activityRead DETAIL

## Requirements

- `diagnostic` 카테고리는 진단·오류 기록의 미래 확장을 위해 예약한다.
- 자연어 호출의 결과를 LLM이 직접 렌더한다. 슬래시 스킬 래퍼를 다시 두지 않는다.
- 파일 I/O는 activityLog에 위임하는 정책을 유지한다. 읽기 전용 도구이며 파일 부재와 손상된 한 줄이 전체 조회를 실패시키지 않아야 한다.
- 대량 활동 기록이 컨텍스트를 압도하지 않도록 엔트리 상한을 적용하고 최근 기록을 남긴다. 절단 전 총수와 truncated를 함께 보고해 일부 결과를 전체로 오해하지 않게 한다.

## API Contracts

### LLM Rendering Convention

자연어 프롬프트(예: "오늘 maencof 활동 보여줘")로 직접 호출되므로 LLM이 다음 형식으로 렌더한다.

표의 컬럼 순서는 Time / Category / Activity / Path이며 푸터는 `> Total: N activities recorded.`다.

- 날짜별로 `## Activity — {date}` 헤더를 반복.
- `path` 미존재 시 `—` 표기.
- 날짜 정렬: 최신(가장 최근) 먼저. 같은 날 엔트리는 append 순(시간순).
- 전체 엔트리 수(`total_entries`)가 0이면 표 대신 `No activity recorded for the given date.` 문장만 출력.

### Error Handling

- 파일 부재 시 throw 없이 빈 결과 반환 (읽기 전용 도구 원칙).
- 라인 파싱 실패 시 해당 라인만 건너뛰고 나머지는 정상 반환(NDJSON 복원력).

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Last Updated

엔트리 상한·절단 신호 또는 LLM 렌더링 규약이 바뀔 때 갱신한다.
