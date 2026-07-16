# shared -- 훅 공통 판별 유틸

## Purpose

모든 hooks 모듈이 공통으로 사용하는 초경량 판별 함수 모음. "FCA 프로젝트 여부", "INTENT.md / DETAIL.md / `.filid/criteria.md` 파일 여부"만 판정하며 I/O 외 의존성 없음.

## Structure

- `isFcaProject.ts` — `isFcaProject` (`.filid/` / `INTENT.md` walk-up 검색)
- `isIntentMd.ts` — `isIntentMd` (파일명 정확 일치)
- `isDetailMd.ts` — `isDetailMd` (파일명 정확 일치)
- `isCriteriaMd.ts` — `isCriteriaMd` (경로 segment 정규화 후 꼬리 일치)
- `fileBasename.ts` — `fileBasename` (internal, `/`·`\` 양쪽 지원)
- `shared.ts` / `index.ts` — barrel re-export

## Conventions

- `isFcaProject(cwd)`: `.filid/` 또는 `INTENT.md` 를 git 루트(`.git`)까지 walk-up 검색 — 하위 디렉토리 cwd에서도 프로젝트 감지, 첫 마커에서 반환
- `fileBasename(path)`: POSIX `/`와 Windows `\` 양쪽 separator 지원 — `lastIndexOf`의 최댓값 사용
- 파일 판정은 `fileBasename(path) === INTENT_MD` / `DETAIL_MD` 정확 일치 (대소문자 구분; 파일명 리터럴은 `constants/documentFiles.js` 단일 원천); `isCriteriaMd`는 경로를 segment 단위로 정규화(`..`·`.`·빈 segment 처리)한 뒤 `[.filid, criteria.md]` 꼬리 일치 — denormalized 경로 우회 방지
- `isFcaProject` 는 git 루트까지 bounded walk-up(level당 `existsSync`); 그 외 함수는 `existsSync` 한 번 또는 순수 문자열 연산
- 함수 네이밍: `is*` 접두사로 boolean predicate 명시

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

## Dependencies

- `node:fs` (`existsSync`)
- `node:path` (`join`, `dirname`)
- `../../constants/documentFiles.js` (`INTENT_MD`, `DETAIL_MD`)
