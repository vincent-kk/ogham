## Purpose

`@ogham/cross-platform` 모노레포 내부 전용 워크스페이스. Windows-Unix 호환성 어댑터의 단일 진실 소스. 6개 플러그인이 esbuild inline 으로 소비.

## Structure

| Path                              | Role                                                                      |
| --------------------------------- | ------------------------------------------------------------------------- |
| `src/`                            | TypeScript 소스 (fractal 루트; `index.ts` barrel)                         |
| `src/spawn/`                      | cross-spawn 래퍼 + 타임아웃 + EOL 정규화 (PR-B 도착)                      |
| `src/paths/`                      | OS 별 home/tmp/config/cache 경로 추상화                                   |
| `src/hostPaths/`                  | 호스트별 플러그인 루트 / 프로젝트 루트 / 문서 채널 해석 (MCP 런타임 전용) |
| `src/instructions/`               | 지침 문서 파일명 + 마커 구간 순수 연산 (훅 안전 — env 판독 없음)          |
| `agyHooks/`·`agyRunner/`·`codexHooks/` | agy↔Claude 훅 번역·러너 + Codex `apply_patch`→`Write`/`Edit` 정규화     |
| `src/env/`                        | 환경변수 / OS 분기 / PATH delimiter / EOL                                 |
| `src/eol/`                        | CRLF → LF, BOM strip                                                      |
| `src/binaries/`                   | which/where 디스커버리 + 24h 캐시 + 설치 가이드                           |
| `src/hooks/`                      | hook bootstrap + selfProbe + errorLog                                     |
| `src/shim/`                       | Windows `.cmd` shim 자동 생성 (빌드 step)                                 |
| `src/launcher/`                   | OS 기본 핸들러로 URL/파일 열기 (`openBrowser`)                            |

## Conventions

- npm publish 금지 (`private: true`); 각 플러그인의 `devDependencies` 에 `workspace:^` 로만 사용.
- esbuild inline 전제 → 각 플러그인 `external` 배열에 본 패키지를 넣지 말 것.
- `process.platform` 분기는 본 패키지 내부에만 두고, 호출자는 추상 API 만 사용.

## Boundaries

### Always do

- 모든 외부 CLI stdout 진입점에 `normalizeEol()`.
- spawn 호출은 `spawnCli()` 단일 진입점.
- 단위 테스트는 `process.platform` mock + fake binary suite.

### Ask first

- 새 OS 분기 추가 (`freebsd` / `openbsd`).
- 외부 npm 의존성 추가 (현재 `cross-spawn`, `which`, `env-paths` 만).

### Never do

- `dist/` 커밋.
- 본 패키지 외부에 `process.platform` 분기를 두지 않음.
- npm 게시 (모노레포 내부 전용).

## Dependencies

- **개발**: `cross-spawn ^7`, `which ^4`, `env-paths ^3`, `typescript ^5.7`, `vitest 4.1` — Node.js ≥ 20, Yarn 4.12 workspaces.
