/**
 * @file hostConfigurationSurfaces.e2e.test.ts
 * @description Temp-home/project E2E for instruct, rule, craft-agent, configure, and changelog surfaces.
 */
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { normalize } from '@ogham/cross-platform';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProjectInstructionManager } from '../../core/claudeMdMerger/index.js';
import {
  inspectHostConfigurationSurfaces,
  resolveHostConfigurationSurfaces,
} from '../../core/hostConfigurationSurfaces/index.js';
import { detectWatchedChanges } from '../../hooks/utils/changelogDebt/index.js';
import { handleClaudeMdMerge } from '../../mcp/tools/claudemdMerge/claudemdMerge.js';

const roots: string[] = [];

afterEach(() => {
  vi.unstubAllEnvs();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function git(projectRoot: string, ...args: string[]): void {
  execFileSync('git', ['-C', projectRoot, ...args], { stdio: 'ignore' });
}

function writeAgent(
  directory: string,
  extension: 'md' | 'toml',
  version: string,
): string {
  mkdirSync(directory, { recursive: true });
  const path = join(directory, `reviewer.${extension}`);
  writeFileSync(
    path,
    extension === 'toml'
      ? `name = "reviewer"\ndescription = "${version}"\ndeveloper_instructions = "Review the selected project surface (${version})."\n`
      : `---\nname: reviewer\ndescription: ${version}\n---\n`,
  );
  return path;
}

describe('host configuration surfaces', () => {
  it.each(['claude', 'codex'] as const)(
    '%s joins instruct, rule, craft-agent, configure, and changelog on real consumer paths',
    async (host) => {
      const root = mkdtempSync(join(tmpdir(), `maencof-${host}-surfaces-`));
      roots.push(root);
      const home = join(root, 'home');
      const projectRoot = join(root, 'project');
      mkdirSync(home);
      mkdirSync(projectRoot);
      git(projectRoot, 'init', '-q');
      git(projectRoot, 'config', 'user.email', 'host-fixture@example.invalid');
      git(projectRoot, 'config', 'user.name', 'Host Fixture');

      const env = {
        HOME: home,
        CLAUDE_CONFIG_DIR: join(home, '.claude'),
        CODEX_HOME: join(home, '.codex'),
      };
      vi.stubEnv('OGHAM_HOST', host);

      const surface = resolveHostConfigurationSurfaces({
        host,
        projectRoot,
        env,
      });

      // instruct: the MCP manager and registry resolve the same effective file.
      expect(
        createProjectInstructionManager(projectRoot).inspect().target,
      ).toBe(surface.instructions.effectivePath);
      handleClaudeMdMerge(projectRoot, { content: 'fixture version one' });
      expect(
        readFileSync(surface.instructions.effectivePath, 'utf8'),
      ).toContain('fixture version one');

      // rule: Claude has Markdown rules; Codex explicitly uses the owned AGENTS section.
      let ruleFile: string | null = null;
      if (surface.rules.support === 'directory') {
        mkdirSync(surface.rules.directoryPath, { recursive: true });
        ruleFile = join(surface.rules.directoryPath, 'behavior.md');
        writeFileSync(ruleFile, 'fixture rule v1\n');
      } else {
        expect(surface.rules.alternative).toBe('instruction-section');
        expect(surface.rules.instructionTarget).toBe(
          surface.instructions.effectivePath,
        );
        expect(surface.changelogPaths).not.toContain('.codex/rules/');
      }

      // craft-agent: each host writes its real project agent format.
      const agentFile = writeAgent(
        surface.agents.projectDirectory,
        surface.agents.extension,
        'v1',
      );
      if (surface.agents.format === 'toml') {
        const definition = readFileSync(agentFile, 'utf8');
        expect(definition).toMatch(/^name\s*=\s*"[^"]+"$/m);
        expect(definition).toMatch(/^description\s*=\s*"[^"]+"$/m);
        expect(definition).toMatch(/^developer_instructions\s*=\s*"[^"]+"$/m);
      }

      git(projectRoot, 'add', '.');
      git(projectRoot, 'commit', '-qm', 'fixture baseline');

      handleClaudeMdMerge(projectRoot, { content: 'fixture version two' });
      if (ruleFile) writeFileSync(ruleFile, 'fixture rule v2\n');
      writeFileSync(
        agentFile,
        surface.agents.extension === 'toml'
          ? 'name = "reviewer"\ndescription = "v2"\ndeveloper_instructions = "Review the selected project surface (v2)."\n'
          : '---\nname: reviewer\ndescription: v2\n---\n',
      );

      // configure: inspection reports exactly the registry-selected consumers.
      expect(inspectHostConfigurationSurfaces(surface)).toMatchObject({
        host,
        instructions: {
          exists: true,
          target: surface.instructions.effectivePath,
        },
        rules: { support: surface.rules.support },
        agents: {
          projectFiles: 1,
          format: surface.agents.format,
        },
      });

      // changelog: the same registry paths are the live git pathspec consumer.
      // git porcelain reports POSIX separators on every platform.
      const watched = (path: string): string =>
        normalize(relative(projectRoot, path));
      const changes = await detectWatchedChanges(projectRoot);
      expect(changes.some((line) => line.includes(watched(agentFile)))).toBe(
        true,
      );
      expect(
        changes.some((line) =>
          line.includes(watched(surface.instructions.effectivePath)),
        ),
      ).toBe(true);
      if (ruleFile)
        expect(changes.some((line) => line.includes(watched(ruleFile)))).toBe(
          true,
        );
    },
  );
});
