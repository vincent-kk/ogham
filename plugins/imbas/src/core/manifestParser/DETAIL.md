# manifestParser — Contract

## Requirements

- 매니페스트 타입은 `stories` 와 `estimation` 둘이다. 타입 → 파일명 매핑은 `constants/files.ts` 의 `MANIFEST_FILE_MAP` 이 단독 소유하며 여기서 파일명을 문자열로 재작성하지 않는다.
- 로드는 항상 스키마 검증을 통과한 값만 반환한다. 검증되지 않은 원본을 호출자에게 넘기지 않는다.
- 파일 읽기는 `lib/fileIo.ts` 의 `readJson` 을 경유한다.
- 요약 함수는 순수 함수다 — 이미 로드된 매니페스트만 입력으로 받고 파일을 다시 읽지 않는다.

## API Contracts

로드는 검증한 문서만 반환하며 요약은 그 문서에 대한 순수 계산이다. 반환 형태와 타입별 오버로드는 진입점 및 구현에서 확인한다.

## Acceptance Criteria

### AC-manifest-schema-gate — 스키마 통과 값만 반환

- 스키마에 맞지 않는 매니페스트 파일에 대해 `loadManifest` 가 reject 한다.
- 검증을 우회해 원본 JSON 을 반환하는 경로가 없다.

### AC-manifest-filename-single-source — 파일명 단일 정본

- `manifestParser/**` 에 `stories-manifest.json` · `estimation.json` 리터럴이 없다.
- 파일명은 `MANIFEST_FILE_MAP` 조회로만 결정된다.

### AC-manifest-summary-pure — 요약 함수 순수성

- `getManifestSummary` · `getEstimationSummary` 가 파일 I/O 를 수행하지 않는다.
- 같은 입력에 대해 같은 출력을 반환한다.

## Last Updated

매니페스트 로드·요약의 검증 및 소유권 계약의 내용과 근거가 바뀔 때 갱신한다.
