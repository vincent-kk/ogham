## Purpose

hook이 소유 구간을 병합·제거하는 데 필요한 순수 함수만 노출한다.

## Structure

- `index.ts`: `mergeSection`, `removeSection`, `sectionMarkers`, 타입 배럴.

## Conventions

- 파일 I/O는 소비자가 소유한다.

## Boundaries

### Always do

- 기존 순수 문자열 의미를 그대로 재수출한다.

### Ask first

- marker 또는 whitespace 보존 계약 변경.

### Never do

- 파일 시스템이나 host 판별을 import.

## Dependencies

- 부모 instructions의 순수 write·marker 함수.
