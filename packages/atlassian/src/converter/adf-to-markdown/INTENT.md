# adf-to-markdown

## Purpose

ADF(Atlassian Document Format) JSON을 Markdown 텍스트로 변환하는 순수 함수 모듈.
블록 노드, 인라인 노드, 마크, 테이블을 재귀적으로 처리한다.

## Structure

| 파일 | 역할 |
|---|---|
| `adf-to-markdown.ts` | 진입점 — doc/array/단일 노드 분기 처리 |
| `convert-block.ts` | 블록 노드(paragraph, heading, list, table 등) 변환 |
| `convert-inline.ts` | 인라인 노드(text, mention, emoji, date 등) 변환 |
| `apply-marks.ts` | strong/em/code/strike/link 마크를 Markdown 구문으로 적용 |
| `convert-table.ts` | ADF 테이블 행/셀을 GFM 파이프 테이블로 렌더링 |
| `index.ts` | 배럴 — `adfToMarkdown` 단일 재수출 |

## Boundaries

### Always do

- 모든 변환을 순수 함수로 구현한다 (입력 → 출력, 부수효과 없음)
- 알 수 없는 노드 타입은 자식 콘텐츠로 폴백 처리한다
- `AdfNode` 타입은 `../types/`에서 가져온다

### Ask first

- 새 ADF 노드 타입 지원 추가 (상위 converter INTENT.md의 17개 타입 목록 변경 시)
- Markdown 방언 변경 (CommonMark vs GFM 선택)

### Never do

- `core/`, `mcp/` 디렉터리에서 임포트하지 않는다
- HTTP 호출, 파일 I/O, 인증 로직을 포함하지 않는다
- 변환 결과를 캐싱하거나 상태를 유지하지 않는다

## Dependencies

- `../types/adf-node.ts` — AdfNode 타입 정의 (내부 sibling organ)
