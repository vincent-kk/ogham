# architecture-migrator

## Purpose

볼트 아키텍처 버전 마이그레이션. 구조 변경 시 자동 디렉토리 재배치 수행.

## Boundaries

### Always do

- EXPECTED_ARCHITECTURE_VERSION 기준으로 마이그레이션 판단
- 마이그레이션 실행 전 백업 로직 포함

### Ask first

- 아키텍처 버전 변경 시 마이그레이션 경로 설계

### Never do

- 사용자 확인 없이 파일 삭제
