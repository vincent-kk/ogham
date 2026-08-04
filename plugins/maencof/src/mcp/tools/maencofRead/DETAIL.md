# maencofRead — Contract

## Requirements

- `read` 는 단일 문서를 읽어 원문 전문(`content`)과 파싱된 노드 메타(`node`)를 돌려준다. SA 관련 문서 확장은 이 도구의 몫이 아니다 — `kg_search`/`kg_context` 소관이며, 입력은 `path` 하나뿐이다.
- 경로는 `resolveWithinVault` 로 vault 봉쇄를 검증하고, 파일 부재·파싱 실패는 예외 대신 `success: false` 결과로 돌려준다.
- `01_Core/`(L1) 문서 읽기에는 memory-organizer 의 간접 접근 규칙을 알리는 warning 을 덧붙인다.

## API Contracts

- `handleMaencofRead(vaultPath: string, input: MaencofReadInput): Promise<MaencofReadResult>`
- `MaencofReadInput` — `{ path }`. `MaencofReadResult` — `MaencofCrudResult & { content, node }`. 정본은 `types/mcpCrud.ts`.
- 실패 형태: vault 봉쇄 위반·파일 부재·파싱 실패 모두 `{ success: false, message, content, node }`(파싱 실패 시 `content` 는 원문 유지).

## Acceptance Criteria

### AC-content-plus-node — 전문과 메타

- 성공 응답은 파일 원문 전문 `content` 와 `FrontmatterSchema` 를 통과한 `node` 를 함께 담는다.

### AC-no-sa-expansion — SA 확장 비소유

- 입력에 `depth`/`include_related` 가 없고 응답에 `related` 필드가 없다 — 관련 문서 탐색은 `kg_search`/`kg_context` 로 안내된다.

### AC-l1-warning — L1 간접 접근 경고

- `01_Core/` 경로 읽기의 성공 응답에는 해당 warning 이 실린다.

## Last Updated

2026-08-05 — content+node 단일 책임과 SA 확장 비소유 계약을 문서화했다 (cross-review FIX-014).
