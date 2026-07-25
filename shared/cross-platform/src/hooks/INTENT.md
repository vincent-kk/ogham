## Purpose

Claude Code hook 진입점 단일화. `runHookEntry`는 현재 Node로 자식을 실행하고,
self-probe 계열은 node/git/PATH/plugin root를 진단하며, 실패를 기록한다.

## Structure

| File               | Role                                                 |
| ------------------ | ---------------------------------------------------- |
| `index.ts`         | barrel                                               |
| `types.ts`         | ProbeResult·SelfProbeOptions                         |
| `bootstrap.ts`     | runHookEntry — spawnSync(process.execPath, [target]) |
| `selfProbe.ts`     | 범용 spawnCli 기반 selfProbe                         |
| `probe/`           | Node builtin 전용 경량 SessionStart probe organ      |
| `errorLog.ts`      | 기존 error-log 호환 barrel                           |
| `error/`           | 경로·JSON 기록·직렬화 함수 organ                     |

## Conventions

- 모든 hook entry 는 `runHookEntry` 경유 (PATH 결손 방지).
- selfProbe 의 writeLog: true + pkg 시 에러를 자동 logHookFailure.
- SessionStart bundle은 `self-probe/hook`만 import한다.
- error-log.json 은 256 KB cap; 초과 시 가장 오래된 항목부터 drop.
- 제한 훅은 `error-log/path` 또는 `error-log/write` 직접 entry를 사용한다.

## Boundaries

### Always do

- hook 실패 시 logHookFailure 로 가시화 (silent skip 금지).
- SessionStart 첫 진입에서 selfProbe(1회).
- 로그 파일 I/O 실패는 훅을 중단하지 않음.

### Ask first

- size cap (256 KB) 변경.
- runHookEntry 의 stdio 모드 변경 (현재 "inherit").

### Never do

- hook 진입에서 `child_process.spawn` 직접 사용.
- error-log 파일을 caller 가 직접 read/write.
- `selfProbeHook`에서 범용 spawn, cross-spawn, executable discovery import.

## Dependencies

- 외부: 없음 (Node 내장만).
- 내부: `../spawn` (범용 selfProbe), `../paths/plugin-cache` (error-log 경로).
