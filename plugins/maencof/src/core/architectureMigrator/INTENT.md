# architectureMigrator

## Purpose

볼트 아키텍처 버전 마이그레이션. 목표는 `EXPECTED_ARCHITECTURE_VERSION`(v3 — L3 서브레이어 + 평면 L5, 허브는 레이어가 아닌 속성)이며, 구조 변경 시 자동 디렉토리 재배치를 수행한다. 모든 작업은 WAL(Write-Ahead Log) 기반으로 원자적으로 실행되며 실패 시 rollback 을 보장한다.

## Conventions

허브는 레이어가 아니라 역할이다. L5를 평면화하면서 허브 속성을 보존해야 문서 위치와 교차 연결 역할을 혼동하지 않는다.

## Boundaries

### Always do

- EXPECTED_ARCHITECTURE_VERSION 기준으로 마이그레이션 판단
- 마이그레이션 실행 전 백업 로직 포함

### Ask first

- 아키텍처 버전 변경 시 마이그레이션 경로 설계

### Never do

- 사용자 확인 없이 파일 삭제
