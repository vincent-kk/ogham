# turn-context-builder

## Purpose

턴 컨텍스트 구성. 핀 노드, companion identity 기반 지시문 생성.

## Boundaries

### Always do

- cache-manager에서 핀 노드 읽기
- companion-guard로 identity 검증

### Ask first

- 지시문 포맷 변경

### Never do

- 캐시 직접 수정
