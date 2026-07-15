## Purpose

호스트마다 다르게 제공되는 **두 좌표**(플러그인 루트 / 프로젝트 루트)의 단일 해석 지점. MCP 서버 런타임 전용 — 훅은 두 호스트 모두 `CLAUDE_PLUGIN_ROOT` 와 세션 cwd 를 받으므로 대상이 아니다.

## Structure

| File                 | Role                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `index.ts`           | barrel                                                             |
| `types.ts`           | `Host` (`claude` / `codex` / `agy` / `unknown`)                    |
| `detectHost.ts`      | `OGHAM_HOST` 마커 판독 — 부재 = claude                             |
| `pluginRoot.ts`      | 자기 설치 디렉터리 (번들 자산·계약 스크립트·설정 HTML)             |
| `projectRoot.ts`     | 사용자 작업물 루트 — `projectRoot`(throw) / `tryProjectRoot`(null) |
| `projectRootMemo.ts` | 프로세스당 workspace 좌표 기억 (claude 에서는 무시)                |
| `absoluteRoot.ts`    | 공급된 경로의 절대성 강제 + `portableResolve` 정규화 (호스트 독립) |

## Conventions

- `pluginRoot()` 는 **env 우선** — Codex 는 훅 프로세스에 `CLAUDE_PLUGIN_ROOT` 를 주입하고 그 cwd 는 세션 디렉터리다. env 부재 + codex 일 때만 cwd 로 폴백한다.
- `projectRoot()` 의 claude 분기는 `process.cwd()` — 기존 동작과 완전히 동일해야 한다 (가산적 변경).
- claude 외 호스트에서 해석 실패는 **throw** — `process.cwd()` 폴백은 플러그인 폴더를 프로젝트로 오인하는 바로 그 결함이다.
- 공급된 경로는 **절대경로만** 수용하고 `portableResolve` 로 정규화한다 (네이티브 `resolve` 금지) — 소비처가 `sha256(root)` 로 프로젝트를 식별하는데, 네이티브 `resolve` 는 Windows 에서만 구분자·드라이브를 바꿔 같은 작업물을 러너마다 다른 프로젝트로 가른다. `portableResolve` 는 경로 플레이버로 win32/posix 를 정해 호스트와 무관하게 결정적이다.

## Boundaries

### Always do

- 프로젝트 대상 MCP 도구는 선택 인자 `project_root`(절대경로)를 받아 그대로 넘긴다.
- 실패해도 되는 정리·수명주기 작업은 `tryProjectRoot()` 로 받아 null 이면 건너뛴다.

### Ask first

- `agy` 분기 확정 (`mcp_config.json` 에 `cwd` 필드가 없어 미실측).
- 새 `OGHAM_HOST` 값 추가.

### Never do

- claude 외 호스트에서 `process.cwd()` 를 프로젝트 루트로 폴백.
- 훅 도달 코드에서 본 모듈 소비 (훅은 호스트가 두 좌표를 다 준다).

## Dependencies

- 외부: Node 내장 (`node:path`).
- 내부: `../paths` (`portableResolve` — 정규화 단일 경유).
