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
- `pluginCache(pkg, version?)` 는 호스트별 상태 루트 밑 `plugins/<pkg>[/version]` 컨벤션 강제. **어느 호스트인지·그 호스트의 루트가 어디인지는 `hostRegistry` 가 답한다** — 본 모듈은 `$HOME` 상대 조립만 담당하며 호스트 이름·호스트 env 이름을 리터럴로 갖지 않는다.
- `hostRegistry` 는 배럴이 아니라 구체 파일로 import 한다 — 본 모듈은 훅 도달 코드(`hooks/errorLog.ts`)라 배럴 재노출 전체가 훅 번들로 딸려온다.
- 호스트가 지정하는 정식 per-plugin data 디렉터리(`CLAUDE_PLUGIN_DATA`·`PLUGIN_DATA` 의 **값**)는 **의도적으로 쓰지 않는다**. 그 경로는 `<plugin>-<marketplace>` 로 install-source 마다 갈리므로(`filid-ogham` ↔ `filid-inline` 실측 공존) 재설치·출처 변경 시 자격증명·설정이 유실되고, Codex 는 그 값을 훅에만 주고 MCP 엔 주지 않아 한 호스트 안에서 두 채널이 분리된다. 우리 `<pkg>` 컨벤션은 install-source 와 채널에 무관하게 안정적이다 — 대가는 uninstall 시 미정리.
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
- 내부: `hostRegistry` (상태 루트 좌표 — 구체 파일 직접 import).
