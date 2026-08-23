/**
 * @file hostConfigurationSurfaces.ts
 * @description Canonical Claude/Codex instruction, rule, agent, and changelog surfaces.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import {
  type SectionArtifactTarget,
  resolveProjectInstructionTarget,
} from '@ogham/agent-artifacts';
import {
  HOSTS,
  hostStateRoot,
  resolveRuntimeHost,
} from '@ogham/cross-platform';

export type ConfigurationHost = 'claude' | 'codex';

export interface DirectoryBehavioralRuleSurface {
  readonly support: 'directory';
  readonly directoryPath: string;
  readonly extension: 'md';
}

export interface UnsupportedBehavioralRuleSurface {
  readonly support: 'unsupported';
  readonly alternative: 'instruction-section';
  readonly instructionTarget: string;
  readonly reason: string;
}

export type BehavioralRuleSurface =
  DirectoryBehavioralRuleSurface | UnsupportedBehavioralRuleSurface;

export interface AgentDefinitionSurface {
  readonly projectDirectory: string;
  readonly userDirectory: string;
  readonly extension: 'md' | 'toml';
  readonly format: 'markdown' | 'toml';
}

export interface HostConfigurationSurfaces {
  readonly host: ConfigurationHost;
  readonly instructions: SectionArtifactTarget;
  readonly rules: BehavioralRuleSurface;
  readonly agents: AgentDefinitionSurface;
  readonly changelogPaths: readonly string[];
}

export interface ResolveHostConfigurationSurfacesOptions {
  readonly host: ConfigurationHost;
  readonly projectRoot: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export interface HostConfigurationInspection {
  readonly host: ConfigurationHost;
  readonly instructions: {
    readonly target: string;
    readonly exists: boolean;
    readonly existingCandidates: readonly string[];
  };
  readonly rules:
    | {
        readonly support: 'directory';
        readonly directoryPath: string;
        readonly files: number;
      }
    | {
        readonly support: 'unsupported';
        readonly alternative: 'instruction-section';
        readonly instructionTarget: string;
      };
  readonly agents: {
    readonly projectDirectory: string;
    readonly userDirectory: string;
    readonly projectFiles: number;
    readonly userFiles: number;
    readonly format: 'markdown' | 'toml';
  };
}

const KNOWLEDGE_WATCH_PATHS = ['01_Core/', '02_Derived/'] as const;
const REFERENCE_PROJECT_ROOT = resolve('/__maencof_host_surface__');

function projectPath(
  projectRoot: string,
  absolutePath: string,
  directory = false,
): string {
  const projectRelative = relative(projectRoot, absolutePath);
  if (
    projectRelative === '..' ||
    projectRelative.startsWith(`..${sep}`) ||
    resolve(projectRoot, projectRelative) !== resolve(absolutePath)
  )
    throw new Error(
      `Configuration surface escapes project root: ${absolutePath}`,
    );

  const portable = projectRelative.split(sep).join('/');
  return directory ? `${portable.replace(/\/$/, '')}/` : portable;
}

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

export function resolveHostConfigurationSurfaces(
  options: ResolveHostConfigurationSurfacesOptions,
): HostConfigurationSurfaces {
  const { host, projectRoot } = options;
  const env = options.env ?? process.env;
  const instructions = resolveProjectInstructionTarget({ host, projectRoot });
  const hostProjectRoot = join(projectRoot, HOSTS[host].stateRootDir);
  const agents: AgentDefinitionSurface = {
    projectDirectory: join(hostProjectRoot, 'agents'),
    userDirectory: resolve(hostStateRoot(host, env), 'agents'),
    extension: host === 'claude' ? 'md' : 'toml',
    format: host === 'claude' ? 'markdown' : 'toml',
  };
  const rules: BehavioralRuleSurface =
    host === 'claude'
      ? {
          support: 'directory',
          directoryPath: join(hostProjectRoot, 'rules'),
          extension: 'md',
        }
      : {
          support: 'unsupported',
          alternative: 'instruction-section',
          instructionTarget: instructions.effectivePath,
          reason:
            'Codex command approval rules are not behavioral instructions; use the maencof-owned AGENTS section.',
        };

  const changelogPaths = unique([
    ...KNOWLEDGE_WATCH_PATHS,
    ...instructions.candidatePaths.map((path) =>
      projectPath(projectRoot, path),
    ),
    projectPath(projectRoot, agents.projectDirectory, true),
    ...(rules.support === 'directory'
      ? [projectPath(projectRoot, rules.directoryPath, true)]
      : []),
  ]);

  return { host, instructions, rules, agents, changelogPaths };
}

export function resolveRuntimeHostConfigurationSurfaces(
  projectRoot: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): HostConfigurationSurfaces | null {
  const host = resolveRuntimeHost(env);
  if (host !== 'claude' && host !== 'codex') return null;
  return resolveHostConfigurationSurfaces({ host, projectRoot, env });
}

function countDefinitionFiles(directory: string, extension: string): number {
  try {
    return readdirSync(directory, { withFileTypes: true }).filter(
      (entry) => entry.isFile() && entry.name.endsWith(`.${extension}`),
    ).length;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    )
      return 0;
    throw error;
  }
}

export function inspectHostConfigurationSurfaces(
  surfaces: HostConfigurationSurfaces,
): HostConfigurationInspection {
  const rules =
    surfaces.rules.support === 'directory'
      ? {
          support: 'directory' as const,
          directoryPath: surfaces.rules.directoryPath,
          files: countDefinitionFiles(
            surfaces.rules.directoryPath,
            surfaces.rules.extension,
          ),
        }
      : {
          support: 'unsupported' as const,
          alternative: surfaces.rules.alternative,
          instructionTarget: surfaces.rules.instructionTarget,
        };

  return {
    host: surfaces.host,
    instructions: {
      target: surfaces.instructions.effectivePath,
      exists: existsSync(surfaces.instructions.effectivePath),
      existingCandidates: surfaces.instructions.candidatePaths.filter((path) =>
        existsSync(path),
      ),
    },
    rules,
    agents: {
      projectDirectory: surfaces.agents.projectDirectory,
      userDirectory: surfaces.agents.userDirectory,
      projectFiles: countDefinitionFiles(
        surfaces.agents.projectDirectory,
        surfaces.agents.extension,
      ),
      userFiles: countDefinitionFiles(
        surfaces.agents.userDirectory,
        surfaces.agents.extension,
      ),
      format: surfaces.agents.format,
    },
  };
}

function referenceSurface(host: ConfigurationHost): HostConfigurationSurfaces {
  return resolveHostConfigurationSurfaces({
    host,
    projectRoot: REFERENCE_PROJECT_ROOT,
    env: {
      [HOSTS[host].stateRootEnv]: join(
        REFERENCE_PROJECT_ROOT,
        '__user__',
        HOSTS[host].stateRootDir,
      ),
    },
  });
}

export const HOST_CONFIGURATION_WATCHED_PATHS: readonly string[] = unique([
  ...referenceSurface('claude').changelogPaths,
  ...referenceSurface('codex').changelogPaths,
]);

function projectPattern(directory: string, extension: string): string {
  return `${projectPath(REFERENCE_PROJECT_ROOT, directory, true)}*.${extension}`;
}

function userAgentPattern(
  host: ConfigurationHost,
  surface: AgentDefinitionSurface,
): string {
  const hostDefinition = HOSTS[host];
  return `\${${hostDefinition.stateRootEnv}:-~/${hostDefinition.stateRootDir}}/agents/*.${surface.extension}`;
}

export function renderHostConfigurationReference(): string {
  const claude = referenceSurface('claude');
  const codex = referenceSurface('codex');
  const claudeRule = claude.rules;
  if (claudeRule.support !== 'directory')
    throw new Error('Claude behavioral rule surface must be a directory');

  return `<!-- Generated by scripts/syncHostConfigurationReference.ts. Do not edit. -->

# Host Configuration Surfaces

Load this file before instruct, rule, configure, craft-agent, or changelog work. Select the current runtime host and use only that column. A write to a different host's path is not success.

| Surface | Claude | Codex |
| --- | --- | --- |
| Project instructions | \`CLAUDE.md\` or the unique existing \`.claude/CLAUDE.md\`; edit only the maencof-owned section through the instruction manager | Effective \`AGENTS.override.md\` when non-empty, otherwise \`AGENTS.md\`; edit only the maencof-owned section through the instruction manager |
| Behavioral rules | \`${projectPattern(claudeRule.directoryPath, claudeRule.extension)}\` Markdown files | unsupported; route behavioral guidance to the maencof-owned instruction section |
| Project agents | \`${projectPattern(claude.agents.projectDirectory, claude.agents.extension)}\` | \`${projectPattern(codex.agents.projectDirectory, codex.agents.extension)}\` |
| User agents | \`${userAgentPattern('claude', claude.agents)}\` | \`${userAgentPattern('codex', codex.agents)}\` |

## Skill routing

- **instruct**: inspect and mutate the instruction manager's effective target. Preserve all text outside the maencof-owned section and report the actual selected path.
- **rule**: on Claude, manage the Markdown rule directory. On Codex, report behavioral rules as unsupported and offer the owned AGENTS instruction section instead; do not report success without that explicit route.
- **configure**: inspect the instruction, rule-support, and agent surfaces from the selected host row. An unsupported rule surface is a capability result, not a healthy directory.
- **craft-agent**: Claude definitions are Markdown. Codex definitions are standalone TOML with required \`name\`, \`description\`, and \`developer_instructions\` fields; load \`codex-reference.md\` for the Codex schema.
- **changelog**: use the registry-derived watched pathspec. It includes both hosts so a host switch cannot hide prior configuration changes.

## Changelog watched pathspec

${HOST_CONFIGURATION_WATCHED_PATHS.map((path) => `- \`${path}\``).join('\n')}
`;
}
