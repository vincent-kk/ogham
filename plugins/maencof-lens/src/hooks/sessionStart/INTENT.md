## Purpose

SessionStart 훅 구현. 진입 시 spawn 없는 환경 자가진단(node/PATH/CLAUDE_PLUGIN_ROOT) 후, 설정이 있으면 볼트 상태를 확인하고 스킬 가이드를 주입한다.

## Conventions

- 주입은 등록된 볼트와 쓸 수 있는 스킬을 한 번 알리는 데서 그친다 — 볼트 문서 본문은 싣지 않는다
- 환경 자가진단은 `process.versions`·env 만 읽고 외부 프로세스를 띄우지 않는다. 진단 오류는 주입을 막지 않고 additionalContext 끝에 경고로 붙는다
- 인덱스가 stale·미구축·legacy 인 볼트는 advisory 로 maencof 세션의 `kg_build` 를 안내한다 — lens 는 읽기 전용이라 직접 재구축하지 않는다
- 배럴을 거치지 않고 concrete 파일을 직접 import 한다 (훅 번들 크기 가드)

## Boundaries

### Always do

- 설정 부재·잘못된 설정·볼트 미준비·환경 탐지 실패 어느 경우에도 정상 종료해 세션을 진행시킨다
- 설정 파일이 없으면 진단 경고 외에는 아무것도 출력하지 않는다

### Ask first

- 주입 템플릿의 capability·constraint 문구 변경 (스킬 표면과 레이어 필터 계약을 광고하는 문장)
- advisory 대상 판정(볼트 상태 분류) 변경

### Never do

- 볼트·설정 파일에 쓰기, 인덱스 재구축 시도
- 자가진단에서 외부 프로세스 spawn
- 볼트 문서 본문을 additionalContext 에 싣기
