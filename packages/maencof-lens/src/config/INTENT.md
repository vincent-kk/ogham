## Purpose

`.maencof-lens/config.json` 설정 관리 모듈. 스키마 정의, 로드/저장, 기본값 상수를 포함한다.

## Structure

- `config-loader/` — 설정 파일 읽기/쓰기/기본값 생성
- `config-schema/` — Zod 기반 스키마 및 타입 정의
- `defaults/` — 기본값 상수 (레이어, 디렉토리명, 파일명, 버전)

## Boundaries

### Always do

- 설정 변경 시 스키마 검증을 반드시 통과시킨다
- 모든 하위 모듈을 index.ts를 통해 재수출한다

### Ask first

- 설정 스키마 구조 변경
- 새로운 설정 필드 추가

### Never do

- 순환 의존성 도입
- 설정 파일에 직접 접근하지 않고 config-loader를 우회
