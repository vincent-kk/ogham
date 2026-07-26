# tree — language-neutral node hierarchy

## Purpose

파일시스템 계층과 StructureAdapter 증거를 결합해 FCA node ownership, classification과 tree 관계를 만든다.

## Structure

| Module             | Role                                                      |
| ------------------ | --------------------------------------------------------- |
| `fractalTree`      | Node 20 directory discovery, adapter metadata와 tree 조립 |
| `organClassifier`  | 문서·organ·entry-point·leaf·purity 우선순위 분류          |
| `boundaryDetector` | target에서 project root까지 문서 경계 탐색                |

## Conventions

- 분류 입력은 adapter가 보고한 entry descriptor를 받고 filename을 해석하지 않는다.
- filesystem I/O는 `scanner/`, 순수 hierarchy 조립은 `treeBuilder/`에 둔다.
- organ 안에서도 traversal을 계속해 nested fractal을 재분류한다.

## Boundaries

### Always do

- entry point와 certainty를 node metadata에 보존
- 분류 우선순위 변경 시 adapter/tree characterization을 함께 갱신

### Ask first

- known organ convention 또는 `classifyNode` 우선순위 변경
- tree owner/parent 공개 계약 변경

### Never do

- filesystem mutate 또는 source rewrite 수행
- entry filename, extension이나 framework package 추측
- `mcp/`, `hooks/` 역방향 import

## Dependencies

- `../../types/`, `../../constants/organNames.js`, adapter contracts, Node filesystem/path
