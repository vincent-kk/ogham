# paths

## Purpose

.imbas/ 디렉토리 구조의 경로 해석. 프로젝트 루트 기반 경로 생성.

## Structure

- `paths.ts` — 경로 해석 함수 (getImbasRoot / getProjectDir / getCacheDir / getRunsDir / getRunDir)
- `utils/projectDirName.ts` — project_ref → 디렉토리 세그먼트 매핑 (GitHub `owner/repo` → `owner--repo`, 비정상 ref 거부)

## Boundaries

### Always do

- 모든 경로는 절대 경로로 반환
- project_ref 는 `projectDirName()` 경유로만 디렉토리 세그먼트로 변환 (훅도 concrete 경로로 동일 함수 사용)

### Ask first

- 디렉토리 구조 변경

### Never do

- 파일 시스템 직접 조작
