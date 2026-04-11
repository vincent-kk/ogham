# boundary-detector -- 경계 탐색과 컨텍스트 체인

## Purpose

임의 파일 경로에서 출발해 가장 가까운 `package.json`을 "boundary"로 찾고, boundary까지의 디렉토리 체인 + 각 디렉토리의 `INTENT.md`/`DETAIL.md` 유무를 수집한다. `hooks/intent-injector`와 `mcp/fractal-navigate`가 컨텍스트 체인 주입에 사용한다.

## Structure

- `boundary-detector.ts` — `findBoundary`, `buildChain`, `ChainResult` 인터페이스

## Conventions

- 경계 = `package.json` 존재 디렉토리 (monorepo 지원: 가장 가까운 것)
- 상향 탐색은 반드시 `dirname(dir) === dir` 조건으로 루트 도달 감지
- `ChainResult`는 leaf → root 순서의 `chain` 배열과 `intents`/`details` Map 쌍으로 반환
- 경계가 없으면 `buildChain`은 null 반환 — 예외 금지
- 모든 경로는 `path.resolve`로 절대 경로로 정규화

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

## Dependencies

- `node:fs` (`existsSync`), `node:path` (`dirname`, `join`, `resolve`)
