## Purpose

sync 실행의 오케스트레이션 — 대상 열거, facts→어댑터 계획 수립, 디스크 반영/검사. 쓰기가 일어나는 유일한 모듈.

## Structure

| Path                             | Role                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| `steps/listPluginDirectories.ts` | 저장소 루트 → `.claude-plugin` 보유 플러그인 디렉터리 목록 |
| `steps/planPluginAdapters.ts`    | 플러그인 1개 → 생성 파일 + 진단 (MCP 변수 오류 포집)       |
| `steps/planRootAdapters.ts`      | 저장소 루트 → 마켓플레이스 어댑터 2종                      |
| `steps/applyFiles.ts`            | 계획 → 쓰기(sync) 또는 비교(check)                         |

## Boundaries

### Always do

- 내용이 디스크와 동일하면 쓰지 않는다 (unchanged — mtime 불변, 결정성 확인 가능).
- check 모드는 어떤 쓰기도 하지 않는다.

### Ask first

- 어댑터 파일 경로 집합 변경 — 플레이북·DETAIL 과 동시 갱신.

### Never do

- Claude 소비 파일 경로로의 쓰기 — 대상 경로는 어댑터 4종 상수로 한정.
