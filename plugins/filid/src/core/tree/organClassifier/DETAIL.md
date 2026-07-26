# organClassifier — Contract

## Requirements

- 문서가 있으면 explicit fractal 선언이 모든 자동 convention보다 우선한다.
- configured known organ name과 infrastructure pattern은 entry point보다 우선한다.
- adapter entry descriptor가 있으면 non-organ directory를 fractal로 분류한다.
- leaf directory는 organ이고 non-leaf proven-pure directory만 pure-function 후보가 된다.
- purity 증거가 없으면 side-effectful로 간주하고 default fractal을 반환한다.

## API Contracts

- `classifyNode(input: ClassifyInput): NodeType` — 순수하고 결정적인 priority classifier.
- `ClassifyInput.entryPoints` — filename 의미 없이 adapter descriptors를 전달한다.
- `isInfraOrgDirectoryByPattern(name): boolean` — double-underscore와 dot prefix convention.

## Acceptance Criteria

### AC-classification-priority — override 순서

- documents, organ name, infra pattern, adapter entry, leaf, purity, default 순서가 table test로 고정된다.
- organ 안의 descendant는 독립 입력으로 다시 분류할 수 있다.

### AC-classification-neutrality — 생태계 중립

- classifier 입력과 구현에 특정 entry filename/extension이 없다.

## Last Updated

2026-07-26 — hasIndex 대신 adapter entry descriptor를 소비하는 계약으로 변경했다.
