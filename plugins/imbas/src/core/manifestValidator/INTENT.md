# manifestValidator

## Purpose

매니페스트 스키마 검증 및 참조 무결성 검사.

## Conventions

경고는 사람이 판단할 신호이며 유효성을 뒤집지 않는다. 로드 실패도 검증 결과로 반환한다.

## Boundaries

### Always do

- manifestParser를 통해 매니페스트 로드

### Ask first

- 검증 규칙 변경

### Never do

- 순환 의존성 도입
