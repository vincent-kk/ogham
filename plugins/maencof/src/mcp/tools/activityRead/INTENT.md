# activityRead

## Purpose

활동 로그 읽기 도구. 자연어 프롬프트("오늘 활동 보여줘" 등)에서 직접 호출되므로 LLM이 출력 렌더링까지 스스로 수행한다.

## Conventions

LLM이 날짜별 Time / Category / Activity / Path 표와 총수로 렌더하며 경로 부재는 —로 표시한다.

## Boundaries

### Always do

- 빈 결과는 No activity recorded 안내로 처리

### Ask first

- 입출력 스키마 변경
- 렌더링 포맷 컬럼 순서/라벨 변경

### Never do

- 활동 로그를 수정하거나 슬래시 스킬 래퍼를 재도입
