# adfToMarkdown

## Purpose

ADF(Atlassian Document Format) JSON을 Markdown 텍스트로 변환하는 순수 함수 모듈. 블록 노드, 인라인 노드, 마크, 테이블을 재귀적으로 처리한다.

## Conventions

미지 노드는 자식 콘텐츠로 폴백한다. 변환 실패로 문서 전체를 버리지 않기 위한 호환 정책이다.

## Boundaries

### Always do

- 모든 변환을 순수 함수로 구현한다 (입력 → 출력, 부수효과 없음)
- 알 수 없는 노드 타입은 자식 콘텐츠로 폴백 처리한다
- `AdfNode` 타입은 `../types/`에서 가져온다

### Ask first

- 새 ADF 노드 타입 지원 추가 (상위 converter INTENT.md의 17개 타입 목록 변경 시)
- Markdown 방언 변경 (CommonMark vs GFM 선택)

### Never do

- 인증·설정 기반 계층이나 MCP 계층에서 임포트하지 않는다
- HTTP 호출, 파일 I/O, 인증 로직을 포함하지 않는다
- 변환 결과를 캐싱하거나 상태를 유지하지 않는다
