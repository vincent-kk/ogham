# fractal-scan -- 프로젝트 프랙탈 스캔 도구

## Purpose

프로젝트 프랙탈 스캔 도구.

## Boundaries

### Always do
- 변경 후 관련 테스트 업데이트
- MCP 응답은 `ScanReportDto`로 변환 후 반환 (in-process `FractalTree` 직접 노출 금지)

### Ask first
- 공개 API 시그니처 변경

### Never do
- 모듈 경계 외부 로직 인라인
- in-process `FractalTree`를 MCP 응답으로 직접 노출 (DTO의 `tree.nodes` 배열 사용)
