# kgBuild — Contract

## Requirements

- 전체·증분 빌드는 같은 저장 계약을 따르고 유효한 선행 스냅샷이 없으면 전체 빌드로 진행한다.
- 활성 문서의 개별 frontmatter 실패는 전체 빌드를 막지 않는다. 실패 목록에는 상한과 절단 전 총수를 두어 광범위 손상도 응답을 압도하지 않게 한다.
- 서고 열거 인덱스는 노드·엣지 수에 영향을 주지 않는다. 서고 문서의 cluster_key 부재·손상은 non-fatal이며 활성 문서의 parseFailures로 보고하지 않는다.
- 빌드 실패는 예외 대신 success:false 결과로 보고하는 계약을 유지한다.

## API Contracts

서고는 그래프 노드·엣지 계약 밖이고 스냅샷도 추적하지 않는다. 따라서 무변경 빌드에서도 서고 열거 인덱스를 재스캔하며, 서고 파싱 실패를 활성 문서의 parseFailures와 섞지 않는다. 빌드 결과 타입과 실패 목록 상한은 구현과 테스트에서 읽는다.

## Acceptance Criteria

### AC-fragment-target — Document identity of anchored links

- Markdown heading/block fragments identify positions inside a target document; graph edges resolve the path before `#` while source Markdown preserves the full fragment. Relative and vault-root paths follow the existing resolver semantics.

### AC-nonfatal-parse-failures — 실패의 비치명성

- 일부 파일이 파싱에 실패해도 빌드 결과는 `success: true` 로 남고 실패 목록이 함께 보고된다.

## Last Updated

전체·증분 빌드의 저장 계약, 파싱 실패 격리 또는 서고와 활성 그래프의 분리가 바뀔 때 갱신한다.
