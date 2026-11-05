## Purpose

볼트 인덱스의 만료와 legacy 상태를 판정한다. 재색인이나 볼트 변경은 수행하지 않는다.

## Conventions

- legacy 마커를 fresh로 보고하면 v1 스키마를 최신으로 오인하므로 별도 라벨로 유지한다.
- 훅 경로의 의존 격리를 위해 maencof에서는 `CACHE_FILES` 상수만 사용하고 파일시스템·경로 처리는 Node 내장 API로 한정한다.

## Boundaries

### Always do

- legacy 마커를 fresh로 보고하지 않아 구형 인덱스가 최신으로 오인되지 않게 한다
- 마커 탐색은 `findIndexMarker`만 단일 진입점으로 사용한다
- 이 경계의 계약 변경은 해당 검증과 함께 갱신하여 소비자와 구현이 어긋나지 않게 한다

### Ask first

- 공개 API 시그니처 변경 (예: `StaleInfo` 필드 추가/제거)
- 다른 모듈에 대한 새로운 의존성 추가
- 마커 우선순위 정책 변경

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
- 외부 npm 패키지 import (`fast-glob` 등)
- 본가 `@ogham/maencof`에서 함수·클래스 import (상수 `CACHE_FILES`만 허용)
- legacy 마커를 fresh로 보고
