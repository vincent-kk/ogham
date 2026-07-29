/** 설정 네임스페이스. project가 user를 재정의한다. */
export type ConfigScope = "user" | "project";

/** 두 레이어 파일의 절대 경로. project는 프로젝트 루트를 모를 때 null. */
export interface ConfigLayerPaths {
  readonly user: string;
  readonly project: string | null;
}

/** 디스크에서 읽은 두 레이어의 원문. 부재/손상은 모두 null. */
export interface ConfigLayerDocuments {
  readonly user: Record<string, unknown> | null;
  readonly project: Record<string, unknown> | null;
  readonly warnings: readonly string[];
}

/** 설정 페이지 GET 응답 본문이자 병합 소비자의 단일 조회 결과. */
export interface ConfigScopeState {
  readonly paths: ConfigLayerPaths;
  readonly layers: {
    readonly user: Record<string, unknown> | null;
    readonly project: Record<string, unknown> | null;
  };
  /** user 위에 project를 deep merge한 결과. 호출자가 스키마 검증한다. */
  readonly effective: Record<string, unknown>;
  /** project 레이어가 값을 가진 리프의 dot path 목록. */
  readonly overridden: readonly string[];
  readonly warnings: readonly string[];
}

export interface ResolveConfigLayersOptions {
  /** `pluginCache()` 키이자 기본 project 디렉터리 이름의 어간. */
  readonly pluginName: string;
  /** 이미 해석된 절대 경로. 알 수 없으면 null → project 레이어 비활성. */
  readonly projectRoot: string | null;
  /** 기본값 `"config.json"`. */
  readonly fileName?: string;
  /** 기본값 `` `.${pluginName}` ``. maencof-lens처럼 다른 이름을 쓰는 곳용. */
  readonly projectDirName?: string;
  /** 기본값 `pluginCache(pluginName)`. cennad의 `CENNAD_CONFIG_PATH`용. */
  readonly userDir?: string;
}
