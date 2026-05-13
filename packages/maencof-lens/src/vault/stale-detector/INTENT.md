## Purpose

볼트 인덱스 만료 감지. `CACHE_FILES.GRAPH_META`(우선) 또는 `CACHE_FILES.INDEX`(legacy v1 라벨 전용) 마커 파일의 mtime을 볼트 마크다운 최신 mtime과 비교한다. Hook 경로 격리를 위해 `node:fs`/`node:path` 빌트인과 본가 `@ogham/maencof`의 `CACHE_FILES` 상수만 의존한다. legacy 마커는 fresh로 보고하지 않고 명시 라벨로 분리해 v1 schema 오인을 차단한다.

## Boundaries

### Always do

- 이 모듈의 단일 책임을 유지한다
- 마커 탐색은 `find-marker.ts`의 `findIndexMarker`만 단일 진입점으로 사용한다
- 변경 시 관련 테스트를 함께 업데이트한다

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
