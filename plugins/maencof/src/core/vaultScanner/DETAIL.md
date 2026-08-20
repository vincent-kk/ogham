# vaultScanner — Contract

## Requirements

- 스캔은 allowlist 다. 인덱싱 대상은 레이어 디렉토리 패턴(`VAULT_SCAN_LAYER_PATTERNS`, 정본은 `constants/vaultScanner.ts`)에 매칭되는 `.md` 뿐이고, 그 밖의 경로는 제외 목록에 이름이 없어도 스캔되지 않는다. 제외 나열(blocklist)이 아닌 이유: 볼트 서고든 미래에 생길 낯선 디렉토리든, 목록에 없는 경로가 그래프로 새지 않게 하려는 것이다.
- 볼트 서고(`99_Archive` — 볼트 런타임 디렉토리이지 이 저장소 경로가 아니다)와 볼트 루트 바로 아래의 문서는 frontmatter 가 유효해도 스캔 결과에 없다. 스캔 단계의 정본 판정은 glob 패턴이고, `documentParser` 의 노드 경로 게이트(`isLayerDirPath`)는 스캔을 우회해 들어온 문서를 막는 두 번째 방어선이다 — 둘 중 하나만 고치면 경계가 갈라진다.
- 서고 열거 스캔(`scanArchive`)은 그래프 인덱싱 스캔(`scanVault`)과 분리된 별도 진입점이다. 대상은 `ARCHIVE_SCAN_PATTERNS`(`99_Archive/**/*.md`) 뿐이고, 결과는 그래프 노드가 되지 않는다 — allowlist 원칙(AC-layer-allowlist-only·AC-archive-not-scanned)은 `scanVault` 에 대해 그대로 유지된다. 두 스캔은 동일한 기본 제외 패턴과 `ScannedFile` 조립(`operations/scanByPatterns`, 내부 헬퍼)을 공유한다.
- 기본 제외 패턴은 allowlist 안쪽에도 적용되며 중첩 앵커(`**` 프리픽스)를 쓴다. 루트 앵커만 두면 볼트 안 내장 앱의 `node_modules` md 가 새어 들어온다. `extraExclude` 는 여기에 더해지기만 하고 allowlist 를 넓히지 못한다.
- 파일을 쓰지 않는다. 읽기 전용 스캔이며, core 에서 파일시스템 I/O 를 직접 수행하는 유일한 자리다.
- 심볼릭 링크는 기본적으로 따라가지 않고, 디렉토리 항목과 dotfile 은 결과에 담기지 않는다.
- 결과는 `relativePath` 사전순으로 정렬되어 나온다 — 스냅샷 비교와 증분 판정이 glob 열거 순서에 의존하지 않게 한다.
- 변경 감지는 mtime 기반이다. 증분 경로는 전체 스캔을 다시 돌려 이전 스냅샷과 비교하므로 allowlist 변경이 증분 경로에도 자동으로 반영된다 — 두 번째 대상 목록을 두지 않는다.

## API Contracts

- barrel `index.ts` — `scanVault` · `scanArchive` · `buildSnapshot` · `computeChangeSet` · `readVaultFile` · `scanIncrementalChanges` + 타입 `ScannedFile` · `FileSnapshot` · `ChangeSet` · `VaultScanOptions`.
- `scanVault(vaultRoot, options?)` — allowlist 에 매칭된 md 의 `ScannedFile[]`. 경로는 `vaultRoot` 기준 상대이고 `mtime` 은 ms 단위다.
- `scanArchive(vaultRoot, options?)` — 서고 패턴(`ARCHIVE_SCAN_PATTERNS`)에 매칭된 md 의 `ScannedFile[]`. 경로·정렬·`mtime` 규약은 `scanVault` 와 동일하다.
- `buildSnapshot(files)` — `FileSnapshot`(relativePath → mtime).
- `computeChangeSet(previous, current)` — `ChangeSet`(added · modified · deleted · unchanged). `deleted` 만 상대 경로 문자열이다.
- `scanIncrementalChanges(vaultRoot, previousSnapshot, options?)` — 위 둘의 합성. 빈 스냅샷을 주면 전체가 `added` 다.
- `readVaultFile(vaultRoot, relativePath)` — UTF-8 문자열. allowlist 를 재검사하지 않는다 — 호출자가 스캔 결과의 경로를 넘긴다는 전제다.
- `VaultScanOptions` — `extraExclude`(추가 제외 glob) · `followSymlinks`(기본 false).

## Acceptance Criteria

### AC-layer-allowlist-only — 레이어 디렉토리만 스캔

- 레이어 디렉토리 아래의 md 는 결과에 포함된다.
- 레이어 디렉토리가 아닌 최상위 디렉토리 아래의 md 는 결과에 없다.

### AC-archive-not-scanned — 서고 미스캔

- 볼트 서고 디렉토리(`99_Archive`, 볼트 런타임 경로) 아래의 md 는 frontmatter 가 유효해도 결과에 없다.

### AC-archive-scan-scoped — 서고 전용 스캔

- `scanArchive` 결과에 레이어 디렉토리·vault 루트 문서가 없고, `99_Archive` 하위 md 만 있다.

### AC-vault-root-not-scanned — 루트 문서 미스캔

- 볼트 루트 바로 아래의 md 는 결과에 없다.

### AC-nested-exclude — 중첩 제외 적용

- 볼트 안 어느 깊이의 `node_modules` 아래 md 도 결과에 없다.
- `extraExclude` 로 지정한 하위 트리는 allowlist 안이어도 결과에서 빠진다.

### AC-read-only-scan — 읽기 전용

- 스캔 경로에서 파일 쓰기 호출이 0건이다.

### AC-deterministic-order — 결정적 순서

- 같은 볼트를 두 번 스캔하면 `relativePath` 사전순의 같은 순서가 나온다.

## History

- 2026-08-20 — 스캔 대상을 제외 나열(blocklist)에서 레이어 디렉토리 allowlist 로 바꿨다. blocklist 는 아는 이름만 막아 서고와 볼트 루트 문서가 그래프에 들어오고 있었고, 디렉토리가 새로 생길 때마다 목록을 뒤따라가야 했다. allowlist 는 목록에 없는 경로를 기본 거부로 두어 그 추격을 없앤다.

## Last Updated

2026-08-21 — 서고 열거 전용 진입점 `scanArchive` 계약을 추가했다 (그래프 인덱싱 스캔과 분리, 조립 공통화는 내부 헬퍼).
