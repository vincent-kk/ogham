# configProvisioner

## Purpose

configRegistry 기반 설정 프로비저닝과 버전이 낮은 설정의 누락 키 보충.

## Conventions

사용자 값은 보존하고 버전이 낮은 설정에 누락된 최상위 키만 보충한다. 새 기본값 도입이 사용자 선택이나 중첩 설정을 초기화해서는 안 된다.

## Boundaries

### Always do

- CONFIG_REGISTRY 참조
- .maencof-meta/ 경로 사용

### Ask first

- 기본값 변경 시 configRegistry 우선 수정

### Never do

- 기존 사용자 값을 기본값으로 덮어쓰거나 중첩 객체를 깊게 병합
