# templates — 배포 템플릿 자산

## Purpose

`setup` 이 대상 프로젝트에 복사하는 정적 템플릿. 규칙 문서와 저장소 게이트
스캐폴드를 관리한다. 런타임 로직은 담지 않는다 — 정적 파일만.

## Structure

| 경로     | 역할                                                          |
| -------- | ------------------------------------------------------------- |
| `rules/` | 배포되는 규칙 문서 + `manifest.json` (전부 opt-in, 필수 없음) |
| `gates/` | 저장소 게이트 placeholder 골격 — 값 없음, 사용자가 채운다     |

## Conventions

- 템플릿은 대상 프로젝트로 복사되는 정적 파일 — 세션 훅은 건드리지 않는다.
- `rules/manifest.json` 이 주입 가능한 규칙 목록을 선언(전부 opt-in — seiri 는
  필수 규칙이 없다). `rules/*.md` 는 raw 바이트로 해시되므로 루트
  `.gitattributes`(LF)·`.prettierignore`(포매터 차단)가 그 전제를 지킨다.
- `gates/` 는 값 없는 스캐폴드 — 임계·검증 명령은 저장소가 소유한다. 다이얼이
  스킬의 게이트 권유 강도만 바꾸며 배포 파일 내용은 불변이다.

## Boundaries

### Always do

- 규칙 추가·문구 변경 시 `sync-rule-hashes` 로 `manifest.json` 해시 재주입.

### Ask first

- 새 템플릿 카테고리 추가 (디렉토리 구조 확장).
- 기존 템플릿 경로 변경 (`setup`·`rule_docs_sync` 로직 영향).

### Never do

- 템플릿에 런타임 로직·구체 값 포함 (정적 스캐폴드만).
- `gates/` 에 임계·검증 명령 박제 (저장소 소유 — 역할 밖).
