# vault-scanner

## Purpose

볼트 디렉토리 스캔. 파일 목록, 스냅샷 생성, 변경 세트 계산.

## Boundaries

### Always do

- VaultScanOptions로 필터링 제어
- mtime 기반 변경 감지

### Ask first

- 스캔 대상 디렉토리 패턴 변경

### Never do

- 파일 쓰기 (읽기 전용)
