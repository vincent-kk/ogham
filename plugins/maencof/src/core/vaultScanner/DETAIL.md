# vaultScanner — Contract

## Requirements

- 스캔은 allowlist 다. 인덱싱 대상은 레이어 디렉토리 패턴(`VAULT_SCAN_LAYER_PATTERNS`, 정본은 `constants/vaultScanner.ts`)에 매칭되는 `.md` 뿐이고, 그 밖의 경로는 제외 목록에 이름이 없어도 스캔되지 않는다. 제외 나열(blocklist)이 아닌 이유: 볼트 서고든 미래에 생길 낯선 디렉토리든, 목록에 없는 경로가 그래프로 새지 않게 하려는 것이다.
- 볼트 서고(`99_Archive` — 볼트 런타임 디렉토리이지 이 저장소 경로가 아니다)와 볼트 루트 바로 아래의 문서는 frontmatter 가 유효해도 스캔 결과에 없다. 스캔 단계의 정본 판정은 glob 패턴이고, `documentParser` 의 노드 경로 게이트(`isLayerDirPath`)는 스캔을 우회해 들어온 문서를 막는 두 번째 방어선이다 — 둘 중 하나만 고치면 경계가 갈라진다.
- 서고 열거 스캔(`scanArchive`)은 그래프 인덱싱 스캔(`scanVault`)과 분리된 별도 진입점이다. 대상은 `ARCHIVE_SCAN_PATTERNS`(`99_Archive/**/*.md`) 뿐이고, 결과는 그래프 노드가 되지 않는다 — allowlist 원칙은 `scanVault` 에 대해 그대로 유지된다. 두 스캔은 동일한 기본 제외 패턴과 `ScannedFile` 조립(`operations/scanByPatterns`, 내부 헬퍼)을 공유한다.
- 기본 제외 패턴은 allowlist 안쪽에도 적용되며 중첩 앵커(`**` 프리픽스)를 쓴다. 루트 앵커만 두면 볼트 안 내장 앱의 `node_modules` md 가 새어 들어온다. `extraExclude` 는 여기에 더해지기만 하고 allowlist 를 넓히지 못한다.
- 파일을 쓰지 않는다. 인덱싱 대상의 열거·스냅샷 읽기를 소유하며, 로그·캐시·마이그레이션의 저장 책임은 각 하위 모듈에 둔다 — 읽기 전용 스캔에 쓰기 책임이 섞이지 않게 한다.
- 심볼릭 링크는 기본적으로 따라가지 않고, 디렉토리 항목과 dotfile 은 결과에 담기지 않는다.
- 결과는 `relativePath` 사전순으로 정렬되어 나온다 — 스냅샷 비교와 증분 판정이 glob 열거 순서에 의존하지 않게 한다.
- 변경 감지는 mtime 기반이다. 증분 경로는 전체 스캔을 다시 돌려 이전 스냅샷과 비교하므로 allowlist 변경이 증분 경로에도 자동으로 반영된다 — 두 번째 대상 목록을 두지 않는다.

## API Contracts

- 스캐너가 만든 항목은 mtime과 size를 같은 stat에서 얻는다. 기존 호출자가 만든 스냅샷과의 호환성을 위해 타입의 size는 선택 사항으로 남긴다. MCP 핸들러에 별도 파일시스템 reader를 추가하지 않는다.
- 파일 읽기 API는 allowlist를 다시 검사하지 않는다. 호출자가 스캔 결과 경로를 넘긴다는 전제이므로 직접 입력의 경로 검증을 대체하지 않는다.

## Acceptance Criteria

### AC-archive-scan-scoped — 서고 전용 스캔

- `scanArchive` 결과에 레이어 디렉토리·vault 루트 문서가 없고, `99_Archive` 하위 md 만 있다.

### AC-read-only-scan — 읽기 전용

- 스캔 경로에서 파일 쓰기 호출이 0건이다.

### AC-deterministic-order — 결정적 순서

- 같은 볼트를 두 번 스캔하면 `relativePath` 사전순의 같은 순서가 나온다.

## Last Updated

레이어 allowlist·서고 분리·스캔 경로 전제가 바뀔 때 갱신한다.
