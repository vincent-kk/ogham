## Purpose

MCP 서버 팩토리. 5개 읽기 전용 툴(`search`, `context`, `navigate`, `read`, `status`)을 등록한다.

## Conventions

- 서브레이어 스키마는 maencof에서 가져온다. 값을 복사하면 폐기된 모델 값을 계속 받아 빈 결과를 성공처럼 반환할 수 있다.
- 설정 부재는 서버 기동을 막지 않고 도구 호출에서 복구 안내를 준다. 설정을 고치기 위한 접근까지 끊지 않는다.

## Boundaries

### Always do

- 서브레이어 스키마를 maencof와 공유하여 폐기값이 빈 결과로 통과하지 않게 한다
- 이 경계의 계약 변경은 해당 검증과 함께 갱신하여 소비자와 구현이 어긋나지 않게 한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
