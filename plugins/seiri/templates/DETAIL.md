# templates — Contract

## Requirements

- 배포되는 규칙 문서의 원본이다. 여기 있는 내용이 곧 사용자 저장소에 놓이는 파일이다.
- 파일은 raw 바이트 기준으로 해시된다. `.gitattributes` 가 LF 를 고정하고 루트 `.prettierignore` 가 포매터를 막는 이유가 이것이다 — 줄바꿈 하나가 전체 드리프트로 읽힌다.
- 매니페스트에 등재된 규칙만 배포 대상이다. 매니페스트와 파일 목록이 어긋나면 빌드 결함이다.
- 규칙은 **전부 opt-in** 이다 — 필수 규칙이라는 개념이 없다.
- `scaffolds/` 는 값 없는 스캐폴드다. 임계·검증 명령은 저장소가 소유하며 여기에 박제하지 않는다.
- 런타임 로직을 담지 않는다. 정적 파일만 있다.
- 규칙 문서는 영어로 쓴다.

## API Contracts

- `rules/*.md` — 배포 대상 규칙 문서. 각 파일의 id 와 해시가 `rules/manifest.json` 에 등재된다.
- `rules/manifest.json` — 주입 가능한 규칙 목록. `grounding`은 작성 시점의 편입 근거이며 배포 문서에 렌더링하지 않는다. 해시는 `sync-rule-hashes` 가 갱신하며 손으로 적지 않는다.
- `scaffolds/` — 저장소 게이트 placeholder 골격. 사용자가 값을 채운다.

## Acceptance Criteria

### AC-manifest-file-parity — 매니페스트 일치

- `rules/` 의 파일 집합과 매니페스트 항목 집합이 일치한다.
- 매니페스트의 해시가 파일의 raw 바이트 해시와 일치한다.
- 모든 매니페스트 항목이 보편적 형식 근거를 `grounding`에 보유하고 배포 문서에는 반복하지 않는다.

### AC-byte-stability — 바이트 안정성

- 포매터·줄바꿈 변환이 템플릿 파일에 적용되지 않는다.

### AC-all-opt-in — 전부 선택 배포

- 매니페스트에 필수(required) 표시를 가진 규칙이 없다.

### AC-scaffolds-valueless — 게이트 스캐폴드

- `scaffolds/` 파일에 구체적 임계값이나 검증 명령이 들어 있지 않다.

## Last Updated

2026-08-30 — 작성 시점의 규칙 편입 근거를 manifest로 옮겨 배포 본문과 분리했다.
