## Purpose

외부 바이너리 (node / git / npm / codex / gemini) 디스커버리 + 24h 캐시 + OS 별 설치 가이드. 호출자는 `which` 직접 사용 금지.

## Structure

| File               | Role                                                     |
| ------------------ | -------------------------------------------------------- |
| `index.ts`         | barrel                                                   |
| `types.ts`         | BinaryStatus                                             |
| `discover.ts`      | `discover(bin, opts)` + `binaries.ensureNode/Git/ensure` |
| `install-hints.ts` | OS × bin 매트릭스 — 명령 + 링크 병기                     |

## Conventions

- 캐시 위치: `~/.claude/plugins/<pkg>/binaries.json` (opts.pkg 기본 `cross-platform`).
- 캐시 TTL: 24h (mtime 기준).
- 설치 hint: 명령 + 공식 링크 병기 (결정 #5).

## Boundaries

### Always do

- 모든 외부 바이너리 lookup 은 `discover` 경유.
- 미발견 시 `installHint` 노출 (silent skip 금지).

### Ask first

- 새 hint 매트릭스 추가 (codex/gemini/node/git/npm 외).
- 캐시 TTL 변경.

### Never do

- `which` / `where` 직접 spawn.
- 캐시 파일을 호출 측에서 직접 read/write.

## Dependencies

- 외부: `which ^4` (inline).
- 내부: `../spawn`, `../paths`, `../env` (via install-hints).
