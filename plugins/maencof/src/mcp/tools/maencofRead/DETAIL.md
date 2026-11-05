# maencofRead — Contract

## Requirements

- 한 문서의 원문과 파싱 메타를 읽는다. SA 관련 문서 확장은 검색·컨텍스트 도구의 책임이다.
- vault 봉쇄를 유지하고 파일 부재·파싱 실패는 success:false 결과로 돌려준다.
- 읽기 범위를 그래프 편입 자격으로 제한하지 않는다. allowNonLayerPath로 레이어 밖 문서도 검증해 읽으며 색인 자격은 색인 경계가 판단한다.
- L1 읽기에는 memory-organizer의 간접 접근 규칙을 알리는 warning을 유지한다.

## API Contracts

문서 읽기의 적용 가능 범위와 그래프 편입 자격은 다르다. 레이어 밖 문서도 검증·읽기할 수 있도록 allowNonLayerPath를 사용하고 색인 자격 검사를 이 도구의 허용 범위로 오해하지 않는다. 파싱 실패에도 원문을 남겨 복구할 수 있게 한다.

## Acceptance Criteria

### AC-document-budget — Readable document size

- Measure the final complete Markdown using core/documentBudget. Above 100 physical lines or 6,000 body Unicode code points, return document_size_exceeded with measurements and rewrite/split guidance.
- Preserve existing warnings and full content; never truncate or reject solely for size. Metadata-only updates and legacy reads also report excessive size.

### AC-no-sa-expansion — SA 확장 비소유

- 입력에 `depth`/`include_related` 가 없고 응답에 `related` 필드가 없다 — 관련 문서 탐색은 `kg_search`/`kg_context` 로 안내된다.

## Last Updated

읽기 범위와 색인 자격의 구분, 파싱 실패 시 원문 보존 또는 L1 접근 경고가 바뀔 때 갱신한다.
