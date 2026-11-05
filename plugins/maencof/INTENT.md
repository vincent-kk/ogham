## Purpose

`@ogham/maencof` 패키지 루트. 마크다운 기반 Knowledge Graph + Spreading Activation 검색을 제공하는 호스트 이식형 개인 지식 공간 관리 플러그인. Windows 호환성은 [`.metadata/cross-platform/`](../../.metadata/cross-platform/) 에서 추적.

## Structure

- `hooks/` 에는 훅 이벤트 매핑 매니페스트만 있다 — 훅 구현체는 `src/hooks/` 가 소유한다. 이름이 겹쳐 구현을 찾는 독자가 먼저 잘못된 쪽을 연다.

## Conventions

- vault 경로는 `MAENCOF_VAULT_PATH` env 또는 호스트 워크스페이스 루트; 둘 다 없으면 throw, 하드코딩 금지
- 5-Layer 모델 v3 준수 (L1~L5). sublayer·hub 교차 규칙의 정본은 `src/types/frontmatter.ts` 의 `FrontmatterSchema` 이고, 서브레이어 허용값의 정본은 같은 파일이 export 하는 `SubLayerSchema` 다 — 패키지 안팎 어느 소비자도 값 목록을 재기술하지 않는다
- frontmatter 규칙 템플릿은 `FrontmatterSchema`와 동기화한다 — 지침과 검증이 서로 다른 필수 필드를 요구하지 않게 한다.

## Boundaries

### Always do

- 빌드 후 `bridge/` 커밋
- 훅 또는 bridge 변경 시 `yarn build:plugin` 으로 재빌드

### Ask first

- L1_Core 문서 삭제 (정체성 영향)
- `kg_build` 를 `force: true` 로 전체 재구축
- bulk cross-layer 문서 이동

### Never do

- .maencof 직접 수정 — 레포 경로가 아니라 vault 루트 아래에 생기는 런타임 인덱스 캐시 디렉터리다
- `bridge/` 손편집 / `src/version.ts` 손편집 (둘 다 빌드가 다시 쓰는 산출물)
