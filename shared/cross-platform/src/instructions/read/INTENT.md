## Purpose

hook이 소유 구간을 판독하는 데 필요한 순수 함수만 노출한다.

## Structure

- `index.ts`: `readSection`, `sectionMarkers`, 관련 타입 공개 배럴.

## Conventions

- read graph에 merge/remove 구현을 포함하지 않는다.

## Boundaries

### Always do

- 상위 instructions 구현을 이름으로만 재수출한다.

### Ask first

- 판독 결과 계약 변경.

### Never do

- 파일 I/O 또는 section 변경 함수 재수출.

## Dependencies

- 부모 instructions의 순수 read·marker 함수.
