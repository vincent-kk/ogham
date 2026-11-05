# configProvisioner

## Purpose

누락된 설정 파일 자동 생성. configRegistry 기반 기본값 프로비저닝.

## Conventions

기존 설정 파일을 덮어쓰지 않는다. 누락된 것만 만든다 — 사용자가 고친 값을 프로비저닝이 되돌리면 안 된다.

## Boundaries

### Always do

- CONFIG_REGISTRY 참조
- .maencof-meta/ 경로 사용

### Ask first

- 기본값 변경 시 configRegistry 우선 수정

### Never do

- 기존 설정 파일 덮어쓰기
