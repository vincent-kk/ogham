# templates contract

## Requirements

- `setup` 스킬이 프로젝트 초기 설정에 쓰는 정적 자산을 담는다.
- `rules/manifest.json`이 주입 가능한 규칙 문서를 선언하며 4개 모두 `required`다.
- `rules/*.md`는 canonical 원본이다. 고치면 `build:rules`로 해시를 동기화하고 `rule_docs_sync`로 배포하기까지가 한 단위다.
- 이 디렉터리는 정적 자산이며 런타임 로직을 담지 않는다. 진입점을 갖지 않는다.

## API Contracts

- `rules/manifest.json` — id·filename·required·title·description·grounding·templateHash. `grounding`은 작성 시점의 편입 근거이며 배포 문서에는 렌더링하지 않는다.
- `rules/*.md` — 배포되는 규칙 문서 원본.

## Acceptance Criteria

### AC-templates-manifest — 해시 동기화

- manifest의 `templateHash`가 원본 파일 내용과 일치한다.
- 모든 항목의 `grounding`이 보편적 형식 근거를 명시하고 규칙 본문에는 반복되지 않는다.

### AC-templates-required — 부분 채택 없음

- 규칙 문서 4개가 모두 `required`이며 optional 엔트리가 없다.

## Last Updated

2026-08-30 — 작성 시점의 규칙 편입 근거를 manifest로 옮겨 배포 본문과 분리했다.
