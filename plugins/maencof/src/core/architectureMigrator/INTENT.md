# architectureMigrator

## Purpose

볼트 아키텍처 버전 마이그레이션 (v1 → v2, L3 서브레이어 + L5 Buffer/Boundary). 구조 변경 시 자동 디렉토리 재배치 수행. 모든 작업은 WAL(Write-Ahead Log) 기반으로 원자적으로 실행되며 실패 시 rollback 을 보장한다.

## Structure

- `index.ts` — 순수 barrel (공개 API: checkArchitectureVersion/classifyL3Document/planMigration/executeMigration/rollbackMigration)
- `operations/` organ — 공개 함수(버전 확인/L3 분류/계획/실행/롤백, 함수 1개/파일)와 barrel 비노출 내부 헬퍼(readArchitectureVersion/updateFrontmatterField/updateVersionFile/writeWAL 는 concrete import 로 공유; 단일 사용 collectMarkdownFiles/parseSimpleFrontmatter/executeOp/rollbackOp 는 inline)

## Boundaries

### Always do

- EXPECTED_ARCHITECTURE_VERSION 기준으로 마이그레이션 판단
- 마이그레이션 실행 전 백업 로직 포함

### Ask first

- 아키텍처 버전 변경 시 마이그레이션 경로 설계

### Never do

- 사용자 확인 없이 파일 삭제
