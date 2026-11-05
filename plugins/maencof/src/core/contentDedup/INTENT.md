# contentDedup

## Purpose

문서 콘텐츠 중복 제거. frontmatter 자동 생성 키 기반 필터링.

## Conventions

중복 제거 기준 변경은 별도 결정을 거친다. 자동 생성 메타데이터와 원본 지식의 구분을 유지해 원본 콘텐츠 손실을 막는다.

## Boundaries

### Always do

- yamlParser 재사용
- AUTO_GENERATED_FM_KEYS 참조

### Ask first

- 중복 판정 기준 변경

### Never do

- 원본 콘텐츠 손실 가능한 변환
