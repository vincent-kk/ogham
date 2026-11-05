# maencofCreate — DETAIL

## Requirements

- 레이어 경로와 평면 레이어의 정본은 아키텍처 상수다. L3 서브레이어만 경로에 반영하며 L1·L5에는 중첩 디렉터리를 만들지 않는다. 쓰기가 설계상의 평면성을 깨지 않아야 한다.
- 파일명 힌트의 세그먼트는 공통 sanitizeSegment로 정규화하되 traversal·과도한 깊이·vault 밖 대상은 거부한다.
- 쓰기 전 frontmatter는 read와 같은 스키마로 검증한다. 생성 직후 읽을 수 없는 문서를 만들지 않아야 한다.
- L1은 비어 있지 않은 gist를 요구한다. 본문 중복 제거와 크기 경고는 원문 손실 없는 문서 관리 정책을 따른다.

## API Contracts

레이어·서브레이어·평면 레이어의 정본은 아키텍처 상수다. frontmatter는 읽기와 같은 스키마로 쓰기 직전에 검증해 생성한 문서가 읽기 불능이 되지 않게 한다. cluster_key는 검색에서 같은 스레드의 대표를 접는 선언이며 경로 분류와 혼동하지 않는다.

## Acceptance Criteria

### AC-document-budget — Readable document size

- Measure the final complete Markdown using core/documentBudget. Above 100 physical lines or 6,000 body Unicode code points, return document_size_exceeded with measurements and rewrite/split guidance.
- Preserve existing warnings and full content; never truncate or reject solely for size. Metadata-only updates and legacy reads also report excessive size.

## Last Updated

평면 레이어·경로 봉쇄, 쓰기 전 frontmatter 검증 또는 원문을 보존하는 크기 경고 계약이 바뀔 때 갱신한다.
