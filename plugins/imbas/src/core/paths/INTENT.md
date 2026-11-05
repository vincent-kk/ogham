# paths

## Purpose

.imbas/ 디렉토리 구조의 경로 해석. 프로젝트 루트 기반 경로 생성.

## Conventions

절대 경로 반환은 호출자가 절대 cwd를 제공한다는 전제에 의존한다. 입력 세그먼트는 경로 주입을 막는 신뢰 경계다.

## Boundaries

### Always do

- 모든 경로는 절대 경로로 반환
- project_ref 는 `projectDirName()` 경유로만 디렉토리 세그먼트로 변환 (훅도 concrete 경로로 동일 함수 사용)

### Ask first

- 디렉토리 구조 변경

### Never do

- 파일 시스템 직접 조작
