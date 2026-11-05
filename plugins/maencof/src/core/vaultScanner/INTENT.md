# vaultScanner

## Purpose

볼트 디렉토리 스캔. 파일 목록, 스냅샷 생성, 변경 세트 계산. 인덱싱 대상은 레이어 디렉토리 allowlist(`VAULT_SCAN_LAYER_PATTERNS`)로 한정한다 — vault 의 서고 디렉토리(99_Archive)와 vault 루트 문서는 frontmatter가 유효해도 스캔 대상이 아니다.

인덱싱 대상 파일의 열거와 스냅샷 읽기를 소유한다. 로그·캐시·마이그레이션의 저장 책임은 각 하위 모듈에 두어 읽기 전용 스캔에 쓰기 책임이 섞이지 않게 한다.

## Conventions

인덱싱 스캔과 서고 열거를 분리한다. allowlist 밖 경로는 기본 거부하여 새 디렉터리가 지식 그래프로 새지 않게 한다.

## Boundaries

### Always do

- VaultScanOptions로 필터링 제어
- mtime 기반 변경 감지
- 레이어 디렉토리 allowlist 스캔 (blocklist 나열 금지 — 낯선 디렉토리가 새지 않게)

### Ask first

- 스캔 대상 디렉토리 패턴 변경

### Never do

- 파일 쓰기 (읽기 전용)
