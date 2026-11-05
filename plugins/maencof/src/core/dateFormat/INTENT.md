# dateFormat

## Purpose

날짜/시간 포맷 순수 헬퍼. YYYY-MM-DD / HH:MM 문자열 생성.

## Conventions

활동 로그와 사용자가 보는 날짜를 맞추기 위해 로컬 시간대를 쓴다. UTC로 바꾸면 자정 근처 기록이 다른 날에 놓인다.

## Boundaries

### Always do

- 순수 함수 유지 (side effect 없음)
- 로컬 시간대 기준 포맷

### Ask first

- 포맷 형식 변경

### Never do

- I/O 또는 상태 의존
