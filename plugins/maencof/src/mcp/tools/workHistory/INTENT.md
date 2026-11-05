# workHistory

## Purpose

work_history 읽기 도구. "그동안 무슨 작업을 했나"를 daily digest 기반으로 답한다. 기간 요약(기본) 또는 토픽/레이어 작업 이력 조회.

## Conventions

읽기 전용 digest 조회이며 생성과 세션 마감은 core workIndex의 책임이다.

## Boundaries

### Always do

- topic/layer가 있으면 이력 조회; 기간·이력은 사람이 읽는 요약으로 렌더

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 또는 daily digest 생성·쓰기
