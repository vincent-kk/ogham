## Purpose

`navigate` 툴 핸들러. 특정 노드의 그래프 이웃(인바운드/아웃바운드 링크, 부모/자식)을 탐색한다.

## Boundaries

### Always do

- 이 모듈의 단일 책임을 유지한다
- 변경 시 관련 테스트를 함께 업데이트한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
