# shared -- 훅 공통 판별 유틸

## Purpose

모든 hooks 모듈이 공통으로 사용하는 초경량 FCA 프로젝트·INTENT.md·DETAIL.md 판별 함수 모음.

## Conventions

- 경로 표기는 host와 무관하게 판정하되 파일명 대소문자는 정확히 구분한다.
- FCA 탐색은 git root에서 멈춘다. 상위 저장소의 marker를 현재 프로젝트의 opt-in으로 오인하지 않기 위해서다.
- 훅 번들은 concrete 판별 파일을 직접 가져간다. 배럴이 재노출한 구현을 모두 싣지 않기 위한 면책은 DETAIL에 선언한다.
- boolean predicate의 이름은 is 접두사로 판별 역할을 드러낸다.

## Boundaries

### Always do

- 경로 판정은 대소문자 구분 유지 (FCA 규칙은 camelCase/PascalCase 구분)
- 새 판별 함수 추가 시 export 이름도 `is*`로 시작

### Ask first

- FCA 감지 마커 추가/변경 (`.git` 는 walk-up 경계로만 사용; `package.json` 등 신규 마커는 협의)
- 대소문자 비교를 `.toLowerCase()` 기반으로 완화

### Never do

- 파일 I/O 외 동작(파싱, 상태 저장) 추가
- `fs.readFileSync` 등 내용 검사 — 파일명·디렉토리 존재만 확인
- criteria ledger나 branch mode 전용 predicate 추가
