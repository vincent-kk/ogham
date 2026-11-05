# contextCacheManage

## Purpose

컨텍스트 캐시 관리 도구. 핀 노드 추가/제거/조회.

## Conventions

핀 상태와 다음 턴 주입이 갈라지지 않도록 실제 변경과 컨텍스트 재조립을 함께 수행한다.

## Boundaries

### Always do

- 핀 변경 뒤 turn context 갱신; 중복 pin과 없는 unpin은 멱등 처리

### Ask first

- 입출력 스키마 변경

### Never do

- 매 턴 이미 주입된 turn context 본문을 도구 응답에 에코
