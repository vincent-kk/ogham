# imbas-cache-manager

## Purpose
Jira 메타데이터 캐시 관리. TTL 기반 만료 검사 및 캐시 CRUD 제공.

## Boundaries
### Always do
- 파일 I/O는 lib/file-io.ts 경유
### Ask first
- 새 캐시 타입 추가
### Never do
- 직접 fs.writeFileSync 호출
