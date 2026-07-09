# vaultScanner

## Purpose

볼트 디렉토리 스캔. 파일 목록, 스냅샷 생성, 변경 세트 계산.

## Structure

- `index.ts` — 순수 barrel (공개 API: scanVault/buildSnapshot/computeChangeSet/readVaultFile/scanIncrementalChanges + 타입)
- `types/` organ — 공개 타입 (ScannedFile/FileSnapshot/ChangeSet/VaultScanOptions)
- `operations/` organ — 스캔/스냅샷/변경 감지 함수 (함수 1개/파일; core 중 유일하게 파일시스템 I/O 직접 수행)

## Boundaries

### Always do

- VaultScanOptions로 필터링 제어
- mtime 기반 변경 감지

### Ask first

- 스캔 대상 디렉토리 패턴 변경

### Never do

- 파일 쓰기 (읽기 전용)
