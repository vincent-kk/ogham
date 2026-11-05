# rRuntime — Contract

## Requirements

- 셸을 경유하지 않고 Rscript를 실행한다. 셸 해석이 사용자 코드 실행의 별도 주입 경로가 되지 않게 한다.
- 탐색·실행·출력 디코딩만 소유하고 통계 의미나 아티팩트 수집은 맡지 않는다.

## API Contracts

- subprocess는 공유 cross-platform 실행 계층을 경유하여 Windows shim·tree-kill·출력 처리가 갈라지지 않게 한다.
- 출력은 디코딩 전 원시 바이트를 보존한다. UTF-8 실패 때만 한국어 Windows 출력의 CP949/EUC-KR로 폴백하고 잘림 사실을 숨기지 않는다.
- 탐색 우선순위 계약은 env → PATH → 공통 경로 → Windows 레지스트리이며 반환 경로는 실행 가능한 절대경로여야 한다. 실행 불가능한 override를 그대로 반환하지 않는다.

## Acceptance Criteria

구체적인 동작과 수치 기준은 소유 모듈의 테스트가 고정하며, 이 문서는 그 선택의 이유와 변경 경계를 기록한다.

## Last Updated

Rscript 탐색·실행 격리·출력 디코딩 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
