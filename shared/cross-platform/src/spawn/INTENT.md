## Purpose

외부 CLI 호출 단일 진입점. timeout + EOL 정규화. win32 `.cmd`/`.bat` shim 은 node entry 를 직접 실행해 cmd.exe 래핑(멀티라인 argv 를 첫 개행에서 절단)을 우회하고, 그 외 경로·POSIX 는 `cross-spawn`. 호출자는 `child_process.spawn` 직접 사용 금지.

## Structure

| File                 | Role                                                     |
| -------------------- | -------------------------------------------------------- |
| `index.ts`           | barrel                                                   |
| `types.ts`           | SpawnOptions / SpawnResult                               |
| `spawnCli.ts`        | 메인 Promise-based spawn 래퍼                            |
| `spawnCliSync.ts`    | spawn.sync 기반 동기 변형 (블로킹)                       |
| `execCli.ts`         | `spawnCli` thin alias (이름 호환성)                      |
| `osTimeout.ts`       | win32 ×3, floor 5000ms                                   |
| `resolveLauncher.ts` | win32: bin → cmd.exe 우회 launcher (.exe 직접/shim→node) |
| `parseCmdShim.ts`    | `.cmd`/`.bat` shim → node entry 파서 (pure, win32 path)  |

## Conventions

- timeoutMs 미지정 시 timeout 없음.
- normalizeEol 기본 true; false 면 raw stdout/stderr.
- stdin 은 `options.input` 으로 단일 chunk; 미지정 시 stdin 즉시 닫힘.
- win32: `.cmd`/`.bat` 은 `resolveLauncher` 가 node entry 추출 → `process.execPath` 직접 spawn (cmd.exe 우회 = 멀티라인 개행 보존); 해석 실패 시 cross-spawn fallback.

## Boundaries

### Always do

- 모든 spawn 호출은 `spawnCli` (async) 또는 `spawnCliSync` (sync caller 전용) 경유.

### Ask first

- 새 inheritEnv / detached / hidden 옵션 노출.
- shell:true 활성화 (cross-spawn 가 안전 처리하므로 불필요).

### Never do

- `child_process.spawn` / `exec` / `execSync` / `execFile` 직접 import.
- timeout kill 에 SIGKILL 외 signal 사용 (Windows 호환 깨짐).

## Dependencies

- 외부: `cross-spawn ^7`, `which ^4` (inline).
- 내부: `../env`, `../eol`.
