# ast-grep-shared

## Purpose
@ast-grep/napi 모듈의 지연 로드 및 graceful degradation 제공. napi 미설치 환경에서도 안전하게 동작.

## Boundaries
### Always do
- napi 미설치 시 `null` 반환 및 `getSgLoadError()`로 오류 메시지 제공
### Ask first
- 지원 언어 확장 또는 파일 확장자 매핑 변경
### Never do
- @ast-grep/napi를 package.json 의존성에 추가
