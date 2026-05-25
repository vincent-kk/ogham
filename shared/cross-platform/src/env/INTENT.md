## Purpose

OS 분기 및 환경변수 추상화. `process.platform` / `process.env.HOME|USERPROFILE` 직접 사용처를 본 모듈로 모은다.

## Structure

| File       | Role                                                                |
| ---------- | ------------------------------------------------------------------- |
| `index.ts` | barrel — `env` 단일 export                                          |
| `env.ts`   | `home()`, `isWindows`, `isMacOS`, `isLinux`, `pathDelimiter`, `eol` |

## Conventions

- 모든 boolean / delimiter / eol 속성은 getter 로 정의 — `process.platform` mock 시 재import 없이 반영.
- `home()` 우선순위: `HOME` → `USERPROFILE` → `os.homedir()`.

## Boundaries

### Always do

- 새 OS 별 분기는 본 모듈 안에서만 결정.

### Ask first

- 새 OS 분기 추가 (`freebsd` / `openbsd`).

### Never do

- 호출 측에서 `process.platform` 분기.
- 호출 측에서 `process.env.HOME|USERPROFILE|TMPDIR|TEMP` 직접 사용.

## Dependencies

- 외부: Node 내장 (`node:os`) 만.
