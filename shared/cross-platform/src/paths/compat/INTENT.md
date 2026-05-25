## Purpose

Windows/POSIX path 문자열을 현재 실행 OS와 독립적으로 판별, 조합, 비교한다. macOS/Linux 러너에서도 Windows drive-letter/UNC 경로를 올바른 path API로 처리한다.

## Structure

| File | Role |
|---|---|
| `index.ts` | public barrel |
| `is-*-like-path.ts` | path flavor 판별 |
| `portable-*.ts` | basename/dirname/join/resolve/relative adapter |
| `path-for-compare.ts` | 비교용 separator/case 정규화 |
| `same-path.ts` | path 동등성 비교 |
| `api-for.ts` | 내부 path API 선택 helper |

## Conventions

- public 함수는 파일당 하나만 둔다.
- `api-for.ts`는 내부 helper이며 barrel export 하지 않는다.
- 입력 문자열의 형태로 `path.win32` / `path.posix` / native `path`를 선택한다.

## Boundaries

### Always do

- Windows-like path 비교는 separator 정규화 후 case-insensitive 로 처리.
- POSIX-like path 비교는 case-sensitive 로 유지.

### Ask first

- path flavor 판별 규칙 변경.

### Never do

- 호출자의 `process.platform` 값으로 입력 path 문자열 의미를 덮어쓰기.

## Dependencies

- 내부: `node:path`
