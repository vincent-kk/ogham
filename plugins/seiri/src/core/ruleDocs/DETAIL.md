# ruleDocs — Contract

## Requirements

- `templates/rules/*.md` 를 호출자가 고른 레이어의 호스트 채널과 조정한다. `project`(기본값)는 저장소 채널, `user` 는 호스트 상태 루트다.
- 호스트마다 채널이 다르다: Claude 는 `rules/` 디렉터리 파일, Codex 는 유효한 `AGENTS*.md` 의 소유 섹션이다.
- **배포 상태의 진실은 파일시스템이다.** config 에 미러링하지 않는다 — 사본은 드리프트만 만든다.
- 사용자 파일을 건드리는 동작은 dry-run 짝을 갖는다. 계획과 실행은 같은 계획을 쓴다.
- 해시는 raw 바이트 기준이다. 그래서 `.gitattributes` 가 규칙 템플릿을 LF 로 고정하고 루트 `.prettierignore` 가 포매터를 막는다.
- **드리프트는 덮지 않는다.** `resync` 에 id 가 명시된 규칙만 덮어쓴다. 사용자의 로컬 편집을 확인 없이 지우지 않는다.
- **레이어는 옮기지 복사하지 않는다.** 양쪽에 남으면 호스트가 같은 규칙을 두 번 읽고, 사본이 갈릴 때 어느 쪽이 이기는지 말할 수 없다. 전환은 새 위치에 먼저 쓰고 그 다음 옛 위치를 지운다 — 반대 순서는 중간 실패 시 규칙을 어디에도 남기지 않는다.
- 마커 밖 사용자 텍스트와 다른 소유자의 아티팩트는 그대로 보존한다. 고아 폐기는 `seiri` 소유 네임스페이스로 제한한다.
- `loadManifest` 는 throw 한다 — 깨진 매니페스트는 사용자 상태가 아니라 빌드 결함이다. 세션 경로 소비자가 이를 흡수한다.
- 세션 훅에서 `applyRuleDocs` 를 부르지 않는다. 배포는 setup 표면 전담이다.
- 배럴은 훅 밖 소비자 전용이다. 훅은 concrete 파일을 직접 import 한다.

## API Contracts

- `loaders/` — `loadManifest`(매니페스트 파싱·검증).
- `status/` — 한 레이어 채널의 배포 상태와 채널 경로 스냅샷(`getRuleDocsStatus`).
- `sync/` — 동일 계획을 쓰는 dry-run 및 실행 어댑터.
- `utils/` — 매니페스트·host·레이어 대상·공유 결과 매핑.

## Acceptance Criteria

### AC-plan-apply-parity — 계획과 실행의 동일성

- dry-run 이 보고한 대상·revision 이 실행 결과와 일치한다.

### AC-filesystem-truth — 파일시스템이 진실

- 배포 상태가 config 파일에 기록되지 않는다.
- 상태 조회가 채널 파일을 읽어 판정한다.

### AC-drift-detection — 드리프트 판정

- 배포된 파일의 raw 바이트 해시가 템플릿과 다르면 드리프트로 보고된다.
- 드리프트한 파일은 `resync` 에 id 가 명시되지 않는 한 덮어쓰이지 않는다.

### AC-layer-move — 레이어 전환

- 레이어를 옮기면 새 위치에 먼저 쓰고 옛 위치를 지운다.
- 전환 후 같은 규칙이 두 레이어에 동시에 남지 않는다.

### AC-ownership-containment — 소유권 경계

- 마커 밖 사용자 텍스트와 다른 소유자의 섹션이 보존된다.
- 폐기 대상이 `seiri` 소유 네임스페이스를 벗어나지 않는다.

## Boundary Exemptions

### loaders — Hook bundles cannot pass through the barrel

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅은 esbuild 번들로 배송되고 크기 가드를 받는다. `index.ts` 를 거치면 배럴이 재노출하는 sync·plan·apply 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다. typecheck 는 이 비대를 잡지 못하고 `build:hooks` 의 가드만 잡으므로, 배럴 경유는 선택지가 아니라 빌드 실패다.

### status — Hook bundles cannot pass through the barrel

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: `loaders` 와 같은 이유다. SessionStart·SubagentStart 가 배포 상태 스냅샷 하나만 필요로 하는데, 배럴을 거치면 apply 경로까지 번들에 들어온다.

## Last Updated

2026-07-30 — 규칙 배포 계약과 훅 직접 import 면책을 문서화했다.
