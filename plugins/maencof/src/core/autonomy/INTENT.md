# autonomy

## Purpose

AutonomyLevel 런타임 게이트. `.maencof-meta/autonomy-config.json`에서 현재 레벨을 관리하고, 에이전트 실행 전 권한 검사를 제공.

## Structure

- `index.ts` — barrel (공개 API: readAutonomyLevel/setAutonomyLevel/canAutoExecute)
- `types/` organ — 내부 타입 (AutonomyConfig)
- `operations/` organ — 레벨 IO·게이트 (configPath 사설 헬퍼 + read/set/canAutoExecute, 함수 1개/파일)

## Boundaries

### Always do

- types/common.ts의 AutonomyLevel 타입 사용
- canAutoExecute는 순수 함수로 유지

### Ask first

- AutonomyLevel 승격 조건 변경

### Never do

- 자동 승격 적용 (제안만 허용)
- mcp/ 또는 hooks/ 직접 의존
