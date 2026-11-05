# core

## Purpose

지식 그래프 핵심 연산 모듈. 문서 파싱, 그래프 구축, 가중치 계산, 확산 활성화의 순수 연산과 vault 저장 경계를 소유한다.

## Conventions

vault I/O는 해당 하위 모듈 경계에서 끝낸다. 서버·훅 수명주기를 끌어오면 core 연산을 독립적으로 재사용할 수 없다.

## Boundaries

### Always do

- 외부 I/O 최소화, 순수 함수 우선
- types/ 중앙 타입 import 사용
- 모듈 간 의존은 명시적 import

### Ask first

- 새 모듈 추가 시 index.ts barrel export 갱신 필요 여부
- vaultScanner I/O 패턴 변경

### Never do

- mcp/ 또는 hooks/ 직접 의존
- 순수 연산에 파일 I/O 혼합 — 저장 부수 효과는 그 책임을 가진 하위 모듈의 명시적인 I/O 경계에 둔다
