# templates — 배포 템플릿 자산

## Purpose

`setup` 이 대상 프로젝트에 복사하는 정적 템플릿. 규칙 문서와 저장소 게이트 스캐폴드를 관리한다. 런타임 로직은 담지 않는다 — 정적 파일만.

## Structure

규칙 파일은 배포 원본이다. 스캐폴드는 저장소가 값을 채울 골격이며 검증 명령이나 임계값을 소유하지 않는다.

## Conventions

- 템플릿은 대상 프로젝트로 복사되는 정적 파일 — 세션 훅은 건드리지 않는다.
- `rules/manifest.json` 이 주입 가능한 규칙 목록을 선언(전부 opt-in — seiri 는 필수 규칙이 없다). `rules/*.md` 는 raw 바이트로 해시되므로 루트 `.gitattributes`(LF)·`.prettierignore`(포매터 차단)가 그 전제를 지킨다.
- `scaffolds/` 는 값 없는 스캐폴드 — 임계·검증 명령은 저장소가 소유한다. 다이얼이 스킬의 게이트 권유 강도만 바꾸며 배포 파일 내용은 불변이다.

## Boundaries

### Always do

- 규칙 추가·문구 변경 시 `sync-rule-hashes` 로 규칙 매니페스트 해시 재주입.

### Ask first

- 새 템플릿 카테고리 추가 (디렉토리 구조 확장).
- 기존 템플릿 경로 변경 (`setup`·`settings` 로직 영향).

### Never do

- 템플릿에 런타임 로직·구체 값 포함 (정적 스캐폴드만).
- `scaffolds/` 에 임계·검증 명령 박제 (저장소 소유 — 역할 밖).
