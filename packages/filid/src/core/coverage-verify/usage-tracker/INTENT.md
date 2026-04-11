# usage-tracker -- 프랙탈 서브트리 내 타겟 모듈 사용처 추적

## Purpose

`FractalTree`를 순회해 지정된 서브트리(`subtreeRoot`) 내에서
타겟 모듈(`targetPath`)을 런타임 import하는 모든 peer 파일을 수집하여
`UsageSite[]`로 반환한다.

## Scope

- 루트 노드 + descendants + organ 아래 프랙탈을 모두 포함해 중복 제거
- peer 파일은 `.ts/.tsx/.js/.jsx/.mts/.mjs/.cts/.cjs`만 대상
- `SKIP_PATTERNS` 매칭 파일은 제외
- 타겟 파일 자신은 제외
- 타입-only import는 제외 (런타임 테스트 대상 아님)
- 파일당 첫 매칭에서 수집 종료 (UsageSite per file)

## Boundaries

### Always do
- `scanProject`가 이미 실행된 경우 `tree` 파라미터로 재사용
- 파일 읽기/AST 파싱 실패는 silent skip
- import 경로 해석은 `../import-resolver`에만 위임

### Ask first
- 공개 API 시그니처(`findSubtreeUsages`, `getModuleName`) 변경
- 파일당 다중 UsageSite 수집으로 정책 변경
- 타입-only import 포함 여부 변경

### Never do
- FractalTree를 직접 재스캔 (상위에서 주입받거나 최초 1회만)
- import 해석 로직 인라인
- 서브트리 밖 노드 탐색
