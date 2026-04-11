# shared -- 훅 공통 판별 유틸

## Purpose

모든 hooks 모듈이 공통으로 사용하는 초경량 판별 함수 모음. "FCA 프로젝트 여부", "INTENT.md 파일 여부", "DETAIL.md 파일 여부"만 판정하며 I/O 외 의존성 없음.

## Structure

- `shared.ts` — `isFcaProject`, `isIntentMd`, `isDetailMd`, `fileBasename` (internal)

## Conventions

- `isFcaProject(cwd)`: `.filid/` 디렉토리 또는 루트 `INTENT.md` 존재 시 true
- `fileBasename(path)`: POSIX `/`와 Windows `\` 양쪽 separator 지원 — `lastIndexOf`의 최댓값 사용
- 파일 판정은 `fileBasename(path) === 'INTENT.md'` / `'DETAIL.md'` 정확 일치 (대소문자 구분)
- 모든 함수는 `existsSync` 한 번 호출 또는 순수 문자열 연산 — 서브 I/O 금지
- 함수 네이밍: `is*` 접두사로 boolean predicate 명시

## Boundaries

### Always do

- 경로 판정은 대소문자 구분 유지 (FCA 규칙은 camelCase/PascalCase 구분)
- 새 판별 함수 추가 시 export 이름도 `is*`로 시작

### Ask first

- FCA 프로젝트 감지에 `.git`, `package.json` 등 다른 마커 추가
- 대소문자 비교를 `.toLowerCase()` 기반으로 완화

### Never do

- 파일 I/O 외 동작(파싱, 상태 저장) 추가
- `fs.readFileSync` 등 내용 검사 — 파일명·디렉토리 존재만 확인

## Dependencies

- `node:fs` (`existsSync`)
- `node:path` (`join`)
