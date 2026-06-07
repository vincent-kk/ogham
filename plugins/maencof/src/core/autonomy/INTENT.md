# autonomy

## Purpose

AutonomyLevel 런타임 게이트. `.maencof-meta/autonomy-config.json`에서 현재 레벨을 관리하고, 에이전트 실행 전 권한 검사를 제공.

## Structure

- `autonomy.ts` — readAutonomyLevel, setAutonomyLevel, canAutoExecute
- `index.ts` — barrel export

## Boundaries

### Always do

- types/common.ts의 AutonomyLevel 타입 사용
- canAutoExecute는 순수 함수로 유지

### Ask first

- AutonomyLevel 승격 조건 변경

### Never do

- 자동 승격 적용 (제안만 허용)
- mcp/ 또는 hooks/ 직접 의존
