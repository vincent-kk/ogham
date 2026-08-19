# vaultScanner

## Purpose

볼트 디렉토리 스캔. 파일 목록, 스냅샷 생성, 변경 세트 계산.
인덱싱 대상은 레이어 디렉토리 allowlist(`VAULT_SCAN_LAYER_PATTERNS`)로 한정한다 —
vault 의 서고 디렉토리(99_Archive)와 vault 루트 문서는 frontmatter가 유효해도 스캔 대상이 아니다.

## Structure

- `index.ts` — 순수 barrel (공개 API: scanVault/buildSnapshot/computeChangeSet/readVaultFile/scanIncrementalChanges + 타입)
- `types/` organ — 공개 타입 (ScannedFile/FileSnapshot/ChangeSet/VaultScanOptions)
- `operations/` organ — 스캔/스냅샷/변경 감지 함수 (함수 1개/파일; core 중 유일하게 파일시스템 I/O 직접 수행)

## Boundaries

### Always do

- VaultScanOptions로 필터링 제어
- mtime 기반 변경 감지
- 레이어 디렉토리 allowlist 스캔 (blocklist 나열 금지 — 낯선 디렉토리가 새지 않게)

### Ask first

- 스캔 대상 디렉토리 패턴 변경

### Never do

- 파일 쓰기 (읽기 전용)
