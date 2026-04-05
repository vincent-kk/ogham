# imbas-manifest-parser

## Purpose
stories/devplan 매니페스트 파일 로드 및 요약 생성.

## Boundaries
### Always do
- 파일 I/O는 lib/file-io.ts 경유
### Ask first
- 매니페스트 포맷 변경
### Never do
- 직접 fs.writeFileSync 호출
