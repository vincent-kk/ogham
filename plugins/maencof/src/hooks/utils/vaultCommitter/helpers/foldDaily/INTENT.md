# foldDaily

## Purpose

하루 1커밋 정책 — 당일의 연속된 자동 커밋(AUTO_COMMIT_SUBJECT_MARKERS 매칭)을 `git reset --soft`로 하나로 접고 재커밋한다. 수동 커밋은 폴딩 경계이며 절대 접지 않는다.

## Structure

- `index.ts` — 순수 barrel (공개 API: findFoldBase/isAutoCommitSubject/tryFoldCommit)
- `operations/` organ — 폴딩 로직 (함수 1개/파일: isAutoCommitSubject/revParse/findFoldBase/tryFoldCommit; revParse 는 barrel 미노출 공용 헬퍼)

## Boundaries

### Always do

- git 실행은 gitUtils `runGit` 경유 (concrete 경로 import)
- 폴딩 재커밋 실패 시 원래 HEAD로 `reset --soft` 복구
- HEAD 부재·root 도달·FOLD_SCAN_MAX_COMMITS 초과 시 폴딩 포기 (null/false 반환)

### Ask first

- 폴딩 대상 marker(AUTO_COMMIT_SUBJECT_MARKERS) 변경
- reset --soft 외 히스토리 조작 방식 도입

### Never do

- `reset --hard` / rebase 등 워킹트리·index를 건드리는 조작
- 당일이 아니거나 자동 커밋이 아닌 커밋을 접기
