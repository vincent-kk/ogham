# structureGuard -- Write/Edit 구조 경고

## Purpose

Write/Edit이 디렉토리 구조를 위반할 가능성을 PreToolUse 시점에 경고한다. (1) INTENT.md 생성으로 organ이 fractal로 재분류되는 경우, (2) organ 하위에 새 디렉토리 생성, (3) import 구문으로 순환 의존성 유발. 어떤 경우에도 블록하지 않으며 `[filid:info]`/`[filid:warn]` 텍스트만 주입.

## Structure

- 이 모듈은 `intentInjector`, `preToolValidator`의 상위/하위가 아니라 PreToolUse가 독립적으로 호출하는 sibling 단계다. 같은 helper 계층이라는 이유만으로 위임 관계로 오인할 수 있어 이를 명시한다.

## Conventions

- 이 단계는 경고만 생성하며 permission을 소유하지 않는다. 상위 orchestrator가 문서 gate와 결과를 합친다.
- organ 중첩 경고는 새 디렉터리 생성에만 적용한다. 기존 파일 편집과 문서로 선언한 nested fractal까지 막으면 정상 작업에 과잉 경고가 된다.
- 도구별 file_path/path와 content/new_string 입력을 같은 검사로 연결해 host 표기 차이로 위험 검사가 달라지지 않게 한다.

## Boundaries

### Always do

- 어떤 조건에서도 `continue: false` 반환 금지 (경고 전용)
- `intentInjector`, `preToolValidator`와 직접 결합하지 않고 PreToolUse orchestration이 각 결과를 합치도록 하며, 공유 판정 로직은 이 파일에 인라인하지 않음

### Ask first

- 새 검사 종류 추가 (`checkForbiddenFile`, `checkNamingConvention` 등)
- 경고를 에러로 승격해 Write/Edit 블록

### Never do

- 동기 I/O 과다 호출 (훅 레이턴시 폭발)
- organ cache(`organStructureChecker`)를 세션 간 공유
