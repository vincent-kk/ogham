# core

## Purpose

지식 그래프 핵심 연산 모듈. 문서 파싱, 그래프 구축, 가중치 계산, 확산 활성화 등 순수 로직 담당.

## Boundaries

### Always do

- 외부 I/O 최소화, 순수 함수 우선
- types/ 중앙 타입 import 사용
- 모듈 간 의존은 명시적 import

### Ask first

- 새 모듈 추가 시 index.ts barrel export 갱신 필요 여부
- vault-scanner I/O 패턴 변경

### Never do

- mcp/ 또는 hooks/ 직접 의존
- 부수 효과를 가진 로직 추가
