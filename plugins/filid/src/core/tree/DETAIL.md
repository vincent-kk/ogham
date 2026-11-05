# tree — Contract

## Requirements

- 모든 machine path를 정규화된 절대 경로로 저장한다.
- directory traversal은 organ에서 멈추지 않고 max depth와 exclusion을 지킨다.
- entry point와 framework peer는 StructureAdapter가 제공하며 tree core가 이름을 추측하지 않는다.
- 문서, known organ, infra pattern, adapter entry, leaf, purity 순서로 분류한다.
- hybrid는 자동 분류하지 않고 unsupported purity는 pure-function으로 간주하지 않는다.
- owner/parent 관계는 FCA fractal 경계를 표현하고 organ은 독립 public parent가 아니다.

## API Contracts

공개 함수와 DTO는 진입점에서 확인한다. tree는 계층·소유권 증거이며 import dependency를 대신하지 않는다.

## Acceptance Criteria

### AC-tree-neutrality — 이름 비의존

- core scanner에는 생태계 entry filename이나 extension literal이 없다.
- 가짜 adapter가 보고한 임의 이름의 entry point로 fractal을 분류한다.

### AC-tree-traversal — fractal 재발견

- organ 아래 문서 또는 entry point가 있는 descendant를 독립 fractal로 찾는다.
- max depth와 exclusion 전후 기존 fixture의 node path 집합이 보존된다.

## Last Updated

tree의 경로 identity, 분류 증거나 owner·parent 관계의 계약이 바뀔 때 갱신한다.
