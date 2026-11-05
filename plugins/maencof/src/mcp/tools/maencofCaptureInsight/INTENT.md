# maencofCaptureInsight

## Purpose

인사이트 캡처 도구. 대화 중 발견된 정보 기록.

## Conventions

훅 배너는 필터 표시만 하며 카테고리 차단은 이 capture-time 경계가 소유한다.

## Boundaries

### Always do

- create 위임 전에 category_filter 집행; L5는 평면 conversation buffer로 위임

### Ask first

- 입출력 스키마 변경

### Never do

- 직접 파일 I/O 또는 별도 카테고리 집행 지점 추가
