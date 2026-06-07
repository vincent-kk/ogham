## Purpose

설정 관련 기본값 상수 정의. 기본 레이어, 설정 디렉토리명, 파일명, 버전을 제공한다.

## Boundaries

### Always do

- 이 모듈의 단일 책임을 유지한다
- 변경 시 관련 테스트를 함께 업데이트한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
