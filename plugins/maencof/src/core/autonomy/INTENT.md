# autonomy

## Purpose

AutonomyLevel 런타임 게이트. 볼트의 자율성 설정 파일에서 현재 레벨을 관리하고, 에이전트 실행 전 권한 검사를 제공.

## Conventions

권한 판정과 레벨 저장을 분리한다. 승격은 제안까지만 하고 자동으로 적용하지 않는다.

## Boundaries

### Always do

- types/common.ts의 AutonomyLevel 타입 사용
- canAutoExecute는 순수 함수로 유지

### Ask first

- AutonomyLevel 승격 조건 변경

### Never do

- 자동 승격 적용 (제안만 허용)
- mcp/ 또는 hooks/ 직접 의존
