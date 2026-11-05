# runIdGenerator

## Purpose

YYYYMMDD-NNN 형식의 충돌 안전 실행 ID 생성.

## Conventions

저장 카운터 대신 실제 실행 디렉터리를 기준으로 삼아 카운터와 디렉터리의 불일치를 피한다.

## Boundaries

### Always do

- 기존 ID와 충돌하지 않는 순차 번호 생성

### Ask first

- ID 형식 변경

### Never do

- 순환 의존성 도입
