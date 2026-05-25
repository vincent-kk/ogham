# Cross-Platform Compatibility

`@ogham/cross-platform` 도입을 통한 Windows-Unix 호환성 작업의 단일 진실 소스입니다. 이 디렉토리는 6개 플러그인 패키지의 spawn/PATH/EOL/경로/타임아웃 결함을 한 곳에서 분석, 계획, 추적하기 위해 존재합니다.

## TL;DR

- **근본 원인 4가지**:
  1. `child_process.spawn` 의 `shell` 옵션 누락으로 인한 Windows `.cmd/.bat` shim 해석 실패.
  2. `hooks.json` 의 `node "..."` 직접 명령으로 인한 Windows 훅 실행 컨텍스트 PATH 결손 (silent failure 발생).
  3. 외부 CLI(`node`, `git`, `npm`, `codex`, `gemini`) 가 PATH 에 항상 존재할 것이라는 잘못된 가정.
  4. 라인 엔딩(CRLF), 경로 분리자(`\`), 환경변수(`HOME` vs `USERPROFILE`), 임시 디렉토리(`/tmp` 하드코딩) 같은 OS 특화 디테일의 부재.
- **통합 해결 전략**:
  단편적인 패치 대신 **`shared/cross-platform` 공유 어댑터 구현 + `cross-spawn` 의존성 일괄 도입 + Windows `.cmd` hook bootstrap** 이라는 3축 아키텍처로 표준화하여 일괄 해결합니다.

## Structure

| File | Role |
| --- | --- |
| `README.md` | 디렉토리 개요 및 메인 인덱스 |
| `architecture.md` | 플랫폼 어댑터 시스템 아키텍처 설계, OS 명령어 매칭, 비호환 패턴 분석 |
| `roadmap.md` | 단계별(PR) 시스템 마이그레이션 로드맵 및 패키지별 작업 범위 |
| `testing.md` | OS 매트릭스 CI 전략, 통합 단위 테스트 설계 및 패키지별 합격 기준(AC) |
