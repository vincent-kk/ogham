# workHistory

## Purpose

work_history 읽기 도구. "그동안 무슨 작업을 했나"를 daily digest 기반으로 답한다.
기간 요약(기본) 또는 토픽/레이어 작업 이력 조회.

## Boundaries

### Always do

- 입력 Zod 스키마 검증, core/workIndex 에 로직 위임
- topic/layer 가 있으면 작업일자 이력, 없으면 기간 요약 반환
- 출력을 사람이 읽기 좋은 요약으로 렌더 (기간: 세션수·활동일·vaultOps·상위토픽; 이력: 최근 작업일 + 일자 목록)

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
- daily digest 생성/쓰기 (읽기 전용 — 생성은 SessionEnd 의 workIndex)

## Output Contract

- `period`: from/to/activeDays/sessionCount/totalDurationMin/vaultOps/topTopics/layers.
- `lookup`: kind(topic|layer)/key/lastWorkedOn/dates.
- 결과 없음(활동 데이터 부재): activeDays=0 또는 dates=[] 로 표현.
