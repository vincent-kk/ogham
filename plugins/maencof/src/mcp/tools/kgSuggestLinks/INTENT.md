# kgSuggestLinks

## Purpose

지식 그래프 링크 추천 도구. 유사도 기반 연결 제안.

## Conventions

태그가 온전한 archive 스텁이 추천 상위를 차지하지 않도록 종합 점수를 침강시킨다.

## Boundaries

### Always do

- 명시 입력 tags만 해석 상태로 보고; 원점수 필드는 침강하지 않음

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 또는 추출 키워드를 사용자 입력 태그처럼 보고
