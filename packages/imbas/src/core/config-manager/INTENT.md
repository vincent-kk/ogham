# config-manager

## Purpose
.imbas/config.json의 dot-path 기반 설정 접근 및 관리.

## Boundaries
### Always do
- 파일 I/O는 lib/file-io.ts 경유
### Ask first
- 설정 스키마 변경
### Never do
- 직접 fs.writeFileSync 호출
