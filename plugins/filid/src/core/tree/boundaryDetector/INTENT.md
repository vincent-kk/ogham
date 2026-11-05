# boundaryDetector -- 경계 탐색과 컨텍스트 체인

## Purpose

임의 파일 경로에서 출발해 가장 가까운 `package.json`을 "boundary"로 찾고, boundary까지의 디렉토리 체인 + 각 디렉토리의 `INTENT.md`/`DETAIL.md` 유무를 수집한다. `hooks/preToolUse/helpers/intentInjector`가 컨텍스트 체인 주입에 사용한다.

## Conventions

- 경계는 가장 가까운 package 선언이다. 모노레포 전체를 하나의 owner로 추정하지 않는다.
- chain은 leaf-first로 유지한다. 소비자가 역순으로 지침을 전달하므로 방향 변경은 계약 변경이다.
- 경계 부재는 예외나 추정 fallback이 아닌 null이다.
- 파일 내용은 읽지 않고 존재만 확인한다. 문서 전달을 위한 경계 탐색에 구문 해석을 끌어들이지 않는다.

## Boundaries

### Always do

- 체인 순서는 leaf-first 유지 (소비자가 역순 주입)
- 존재 검사는 `existsSync`만 사용 (비동기 불필요)

### Ask first

- 경계 정의를 `package.json` 외 다른 파일(`tsconfig.json` 등)로 확장
- 체인 결과에 `README.md` 같은 새 표식 파일 추가

### Never do

- 경계보다 위(상위 모노레포 루트) 디렉토리를 체인에 포함
- 파일 내용 읽기 (존재 여부만 검사)
- `rules/`, `analysis/` 등 상위 계층 import
