## Purpose

Claude Code hook 진입점 단일화. (1) `runHookEntry` 가 `process.execPath` 로 자식 node 실행 → PATH 무의존. (2) `selfProbe` 가 node/git/PATH/CLAUDE_PLUGIN_ROOT 자가 진단. (3) `logHookFailure` 가 silent failure 가시화.

## Structure

| File              | Role                                                 |
| ----------------- | ---------------------------------------------------- |
| `index.ts`        | barrel                                               |
| `types.ts`        | ProbeResult                                          |
| `bootstrap.ts`    | runHookEntry — spawnSync(process.execPath, [target]) |
| `self-probe.ts`   | selfProbe — node/git/PATH/pluginRoot 진단            |
| `error-log.ts`    | logHookFailure — JSON append, 256 KB cap rotation    |

## Conventions

- 모든 hook entry 는 `runHookEntry` 경유 (PATH 결손 방지).
- selfProbe 의 writeLog: true + pkg 시 에러를 자동 logHookFailure.
- error-log.json 은 256 KB cap; 초과 시 가장 오래된 항목부터 drop.

## Boundaries

### Always do

- hook 실패 시 logHookFailure 로 가시화 (silent skip 금지).
- SessionStart 첫 진입에서 selfProbe(1회).

### Ask first

- size cap (256 KB) 변경.
- runHookEntry 의 stdio 모드 변경 (현재 "inherit").

### Never do

- hook 진입에서 `child_process.spawn` 직접 사용.
- error-log 파일을 caller 가 직접 read/write.

## Dependencies

- 외부: 없음 (Node 내장만).
- 내부: `../spawn` (selfProbe), `../paths` (error-log 경로).
