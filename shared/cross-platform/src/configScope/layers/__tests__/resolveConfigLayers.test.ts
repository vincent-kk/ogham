import { describe, expect, it } from "vitest";

import { pluginCache } from "../../../paths/index.js";
import { resolveConfigLayers } from "../index.js";

describe("resolveConfigLayers", () => {
  it("anchors the user layer under the host plugin cache", () => {
    const { user } = resolveConfigLayers({
      pluginName: "deilen",
      projectRoot: "/repo",
    });

    expect(user).toBe(`${pluginCache("deilen")}/config.json`);
  });

  it("anchors the project layer under a dot directory named for the plugin", () => {
    const { project } = resolveConfigLayers({
      pluginName: "deilen",
      projectRoot: "/repo",
    });

    expect(project).toBe("/repo/.deilen/config.json");
  });

  it("disables the project layer when no project root was resolved", () => {
    const layers = resolveConfigLayers({
      pluginName: "deilen",
      projectRoot: null,
    });

    expect(layers.project).toBeNull();
    expect(layers.user).toContain("config.json");
  });

  it("honours a custom file name", () => {
    const layers = resolveConfigLayers({
      pluginName: "deilen",
      projectRoot: "/repo",
      fileName: "settings.json",
    });

    expect(layers.project).toBe("/repo/.deilen/settings.json");
    expect(layers.user).toContain("settings.json");
  });

  it("honours a custom project directory name", () => {
    const { project } = resolveConfigLayers({
      pluginName: "maencof-lens",
      projectRoot: "/repo",
      projectDirName: ".lens",
    });

    expect(project).toBe("/repo/.lens/config.json");
  });

  it("honours a custom user directory", () => {
    // cennad의 CENNAD_CONFIG_PATH 케이스.
    const { user } = resolveConfigLayers({
      pluginName: "cennad",
      projectRoot: null,
      userDir: "/custom/cennad",
    });

    expect(user).toBe("/custom/cennad/config.json");
  });

  it("keeps Windows-style roots on Windows separators", () => {
    const { project } = resolveConfigLayers({
      pluginName: "deilen",
      projectRoot: "C:\\repo",
    });

    expect(project).toBe("C:\\repo\\.deilen\\config.json");
  });

  it("does not consult the filesystem", () => {
    // 존재하지 않는 경로여도 좌표는 계산된다. 좌표 계산과 디스크 조회는
    // 분리된 관심사다.
    const { project } = resolveConfigLayers({
      pluginName: "ghost",
      projectRoot: "/definitely/not/here",
    });

    expect(project).toBe("/definitely/not/here/.ghost/config.json");
  });
});
