## Purpose

볼트 인덱스 만료 감지. `.maencof/index.json`의 mtime과 볼트 파일의 최신 mtime을 비교한다. Hook 경로 격리를 위해 `node:fs` 빌트인만 사용 (fast-glob 의존 금지); 큰 vault 에서는 정확 stale 판정을 별도 skill 경로에서 수행한다.

## Boundaries

### Always do

- 이 모듈의 단일 책임을 유지한다
- 변경 시 관련 테스트를 함께 업데이트한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
- 외부 패키지 import (`fast-glob` 등) — hook 격리 위해 `node:fs` 빌트인만 사용
