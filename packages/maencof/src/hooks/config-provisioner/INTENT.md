# config-provisioner

## Purpose

누락된 설정 파일 자동 생성. config-registry 기반 기본값 프로비저닝.

## Boundaries

### Always do

- CONFIG_REGISTRY 참조
- .maencof-meta/ 경로 사용

### Ask first

- 기본값 변경 시 config-registry 우선 수정

### Never do

- 기존 설정 파일 덮어쓰기
