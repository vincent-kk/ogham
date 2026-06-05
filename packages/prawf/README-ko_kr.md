# prawf

[ogham](https://github.com/vincent-kk/ogham) 모노레포의 Claude Code 플러그인.

> **상태: 골격(skeleton).** 현재는 빌드/테스트 스캐폴딩과 FCA 구조만 갖추고 있습니다. MCP 서버 · skills · hooks 등 기능 채택 여부는 아직 미정입니다.

## 설치

```bash
/plugin marketplace add vincent-kk/ogham
/plugin install prawf@ogham
```

## 개발

```bash
yarn prawf build       # 빌드
yarn prawf typecheck   # 타입 체크
yarn prawf test:run    # 테스트 실행
```

전체 작업 가이드는 [CLAUDE.md](./CLAUDE.md) 참조.

English: [README.md](./README.md)
