## Purpose

외부 CLI 호출 단일 진입점. `cross-spawn` 기반으로 Windows `.cmd`/`.bat` shim 자동 해석 + timeout + EOL 정규화. 호출자는 `child_process.spawn` 직접 사용 금지.

## Structure

| File                | Role                                |
| ------------------- | ----------------------------------- |
| `index.ts`          | barrel                              |
| `types.ts`          | SpawnOptions / SpawnResult          |
| `spawn-cli.ts`      | 메인 Promise-based spawn 래퍼       |
| `spawn-cli-sync.ts` | spawn.sync 기반 동기 변형 (블로킹)  |
| `exec-cli.ts`       | `spawnCli` thin alias (이름 호환성) |
| `os-timeout.ts`     | win32 ×3, floor 5000ms              |

## Conventions

- timeoutMs 미지정 시 timeout 없음.
- normalizeEol 기본 true; false 면 raw stdout/stderr.
- stdin 은 `options.input` 으로 단일 chunk; 미지정 시 stdin 즉시 닫힘.

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

- 외부: `cross-spawn ^7` (inline).
- 내부: `../env`, `../eol`.
