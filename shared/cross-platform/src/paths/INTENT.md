## Purpose

OS 별 경로 추상화. home / tmp / config / cache / plugin cache 와 Windows/POSIX path 문자열 호환성의 단일 진입. 호출자는 `~/.claude/plugins/<pkg>` 같은 하드코딩 대신 본 모듈만 사용.

## Structure

| File       | Role                                                      |
| ---------- | --------------------------------------------------------- |
| `index.ts` | barrel                                                    |
| `paths.ts` | `paths.home/tmp/configDir/cacheDir/pluginCache/normalize` |
| `compat/`  | Windows/POSIX path 문자열 판별, 조합, 비교                |

## Conventions

- 외부 OS 별 위치 결정은 `env-paths` 위임 — Windows AppData, macOS Library/Application Support, Linux XDG.
- `pluginCache(pkg, version?)` 는 호스트별 상태 루트(claude=`CLAUDE_CONFIG_DIR ?? ~/.claude`, codex=`CODEX_HOME ?? ~/.codex`) 밑 `plugins/<pkg>[/version]` 컨벤션 강제. 호스트 판별은 프로세스 종류별로 다르다 — MCP 는 어댑터가 넣은 `OGHAM_HOST`, 훅은 Codex 가 주입하는 `PLUGIN_DATA`(claude·agy 는 미설정) 로 감지해 훅도 Codex 면 `~/.codex` 로 간다.
- `normalize(p)` 는 backslash → forward 단방향.
- `compat/` public 함수는 함수별 파일로 유지해 inline 번들 tree-shaking 을 돕는다.

## Boundaries

### Always do

- 모든 plugin cache 디렉토리 결정은 `pluginCache(pkg)` 경유.
- Windows/POSIX path 문자열 판별과 비교는 `compat/` 경유.

### Ask first

- env-paths 외 다른 위치 결정 라이브러리 채택.
- `~/.claude/plugins/` 경로 컨벤션 변경 (호환성 영향).

### Never do

- 호출 측에서 `os.homedir()` / `os.tmpdir()` 직접 호출.
- `~/.claude/plugins/` 같은 경로 문자열 하드코딩.

## Dependencies

- 외부: `env-paths ^3` (inline).
- 내부: 없음.
