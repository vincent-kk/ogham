## Purpose

크로스플랫폼 Rscript 실행 런타임. Rscript 바이너리를 탐색하고, 셸을 경유하지 않고 `--vanilla` 로 spawn 하며, 원시 출력 버퍼를 UTF-8/CP949 로 디코딩한다. 통계 정책은 모르고 실행 안전만 책임진다.

## Structure

| File                            | Role                                                                  |
| ------------------------------- | --------------------------------------------------------------------- |
| `operations/discoverRscript.ts` | env → PATH → 공통 경로 → (Windows) 레지스트리 탐색; 실패 시 null       |
| `operations/spawnRscript.ts`    | `spawn(shell:false)` + 타임아웃(SIGKILL) + AbortSignal; 원시 버퍼 반환 |
| `operations/decodeOutput.ts`    | UTF-8(fatal) 우선 → euc-kr(CP949) fallback + 길이 truncate             |
| `index.ts`                      | barrel                                                                 |

## Conventions

- 모든 subprocess 호출은 `@ogham/cross-platform`(`spawnCli`/`spawnCliSync`) 경유 — `child_process` 직접 사용 금지 (Windows shim·tree-kill·EOL 일관)
- 인자는 `["--vanilla", scriptPath]` 고정; 출력은 latin1 무손실 왕복 후 `decodeOutput` 으로 UTF-8/CP949 디코딩
- 탐색의 PATH/공통경로는 fs 검사(비-CLI), 레지스트리 질의만 `spawnCliSync`
- 취소는 `AbortSignal` → cross-platform tree-kill

## Boundaries

### Always do

- `shell: false` 로만 spawn
- 타임아웃·Abort 시 SIGKILL 로 자식 종료

### Ask first

- 탐색 경로 우선순위 변경
- spawn 인자(`--vanilla`) 변경

### Never do

- 셸 경유 실행 (이스케이프·인젝션 위험)
- 통계 정책·아티팩트 수집 책임 침범 (workspace 소관)

## Dependencies

- `@ogham/cross-platform` (`spawnCli`, `spawnCliSync`), `node:fs`, `node:path`
- `../../constants/defaults`, `../../types/enums`, `../../types/rExecution`, `../../utils/detectPlatform`
