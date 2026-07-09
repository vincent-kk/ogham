# vaultRedirector

## Purpose

볼트 경로 리디렉션. .maencof 디렉토리 접근 차단 및 경로 보정.

## Structure

- `index.ts` — 순수 barrel (공개 API: isVaultInternalPath/isVaultDocDirectory/runVaultRedirector + 타입)
- `types/` organ — 훅 I/O 타입 (VaultRedirectorInput/VaultRedirectorResult)
- `operations/` organ — 경로 판별·리디렉트 (함수 1개/파일: isVaultInternalPath/isVaultDocDirectory/runVaultRedirector; INTERNAL_DIRS 공용 상수)

## Boundaries

### Always do

- MAENCOF_DIR/META_DIR 경로 기반 판단
- isMaencofVault 선행 검증

### Ask first

- 차단 경로 패턴 변경

### Never do

- 리디렉션 우회
