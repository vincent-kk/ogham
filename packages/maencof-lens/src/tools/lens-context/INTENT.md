## Purpose

`lens_context` 툴 핸들러. 토큰 예산 기반으로 볼트 문서를 조합하여 컨텍스트 블록을 생성한다.

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
