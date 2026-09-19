# facts — submitted-facts dispatcher

## Purpose

프로젝트가 가진 사실의 상태를 보고하고, 에이전트가 추출한 사실 배치를 검사해 받아들이는 MCP 표면이다. 추출은 에이전트가 자기 Bash로 하고, 이 도구는 그 산출물만 읽는다.

## Conventions

- `action`은 정확히 한 handler를 선택한다.
- 응답의 목록에는 상한과 남은 개수가 함께 실리고, 요약만으로 다음 행동을 고를 수 있다.
- 거부는 호출 단위(epoch)와 레코드 단위, 참조 단위로 나뉜다.
- 검사에 실패한 경로는 안정적 코드와 `nextAction`을 가진 진단으로 돌려준다.

## Boundaries

### Always do

- 제출 파일을 열기 전에 절대성·프로젝트 밖·symlink·일반 파일·크기를 검사
- epoch 불일치는 호출 전체를 거부하고 새 epoch와 경로 차이를 함께 반환
- 모든 action 응답에 다음 단계 `nextAction`을 싣기
- 범위가 선언되지 않은 프로젝트에는 통과가 아니라 `facts-uninitialized`를 반환

### Ask first

- action 추가·제거 또는 응답 DTO 변경
- 제출 파일 상한과 목록 상한 변경

### Never do

- 제출 파일의 byte나 parser·schema 오류 원문을 응답에 싣기
- 어떤 명령도 실행
- 제출로 선언된 범위를 넓히기
- 레코드를 지우는 action을 노출
