## Purpose

Claude Code hook 진입점 단일화. `runHookEntry`는 현재 Node로 자식을 실행하고,
self-probe 계열은 node/git/PATH/plugin root를 진단하며, 실패를 기록한다.

## Conventions

- 모든 hook entry 는 `runHookEntry` 경유 (PATH 결손 방지).
- selfProbe 의 writeLog: true + pkg 시 에러를 자동 logHookFailure.
- 외부 hook은 `@ogham/cross-platform` 루트에서 필요한 심볼만 import한다.
- 같은 패키지 subtree는 진단·오류 기록의 concrete 파일을 직접 import한다.
- error-log.json 은 256 KB cap; 초과 시 가장 오래된 항목부터 drop.
- `sideEffects: false` tree-shaking과 emitted byte·output forbidden-pattern guard가 제한 hook의 격리를 검증한다.

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
