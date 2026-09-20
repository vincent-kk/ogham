import type { FileFacts } from '../../../../../core/facts/index.js';
import type { Random } from '../../../core/properties/helpers/createRandom.js';

import { createFactsProject } from './createFactsProject.js';
import type { FactsProject } from './createFactsProject.js';

/** What one modelled file holds, as distinct from what a tool reports. */
export interface WorldFile {
  /** Specifiers imported on a live line — the truth about this file's edges. */
  live: string[];
  /** Specifiers present in the bytes but only inside a comment. */
  commented: string[];
}

/** How a modelled extraction differs from an honest reading of the tree. */
export type ToolMode = 'exact' | 'lossy' | 'other';

/** A modelled project plus the operations a scenario applies to it. */
export interface FactsWorld {
  /** The throwaway project the model is written into. */
  project: FactsProject;
  /** Source files that currently exist, in path order. */
  livePaths(): string[];
  /** What the file at this path holds, or undefined when it is gone. */
  fileOf(path: string): WorldFile | undefined;
  /** The in-project path a specifier names, or null when nothing is there. */
  targetOf(specifier: string): string | null;
  /** Whether the declared scope still covers this path. */
  covered(path: string): boolean;
  /** Apply one random operation; returns a label for the failure message. */
  mutate(random: Random): string;
  /**
   * What a tool would report about the tree as it now stands.
   *
   * `only` narrows it to the files a response asked for.
   */
  extract(mode: ToolMode, random: Random, only?: ReadonlySet<string>): FileFacts[];
}

/** Sources a scenario may hold; kept small so seeds collide on purpose. */
const SLOTS = ['src/f0.ts', 'src/f1.ts', 'src/f2.ts'];

/** Provenance of each modelled tool. */
const TOOLS: Record<ToolMode, { tool: string; version: string }> = {
  exact: { tool: 'honest', version: '1.0.0' },
  lossy: { tool: 'honest', version: '1.0.0' },
  other: { tool: 'other', version: '2.0.0' },
};

/**
 * Build a modelled project of `size` source files.
 *
 * The model holds two things the server cannot see: which specifiers are really
 * imports and which merely sit in the bytes inside a comment. That gap is the
 * whole subject — filid does not parse source, so a commented specifier is
 * indistinguishable from a live one to every check it runs, and the invariants
 * are about what the system concludes when a tool and the bytes disagree.
 *
 * @param size - How many source files to create, capped by the slot list.
 * @returns The world, with its project already written to disk.
 */
export function createFactsWorld(size: number): FactsWorld {
  const paths = SLOTS.slice(0, Math.max(2, Math.min(size, SLOTS.length)));
  // Seeded with a live import each, so a scenario starts with edges to lose
  // rather than spending its operations building the first one.
  const files = new Map<string, WorldFile>(
    paths.map((path, index) => [
      path,
      {
        live: [specifierFor(paths[(index + 1) % paths.length] as string)],
        commented: [],
      },
    ]),
  );
  const excluded: string[] = [];
  const everExisted = new Set<string>(paths);
  let noise = 0;
  const project = createFactsProject({ '.filid/config.json': config([]) });
  const world: FactsWorld = {
    project,
    livePaths: () => [...files.keys()].sort(),
    fileOf: (path) => files.get(path),
    targetOf: (specifier) => {
      const path = specifier.replace(/^\.\//, 'src/').replace(/\.js$/, '.ts');
      return files.has(path) ? path : null;
    },
    covered: (path) => !excluded.includes(path),
    mutate: (source) => mutate(source),
    extract: (mode, source, only) => extract(mode, source, only),
  };

  /**
   * Write every modelled file, and remove the ones the model dropped.
   * @returns Nothing; the project on disk matches the model afterwards.
   */
  function sync(): void {
    for (const [path, file] of files) project.write(path, render(file));
    project.remove(...[...everExisted].filter((path) => !files.has(path)));
    project.write('.filid/config.json', config(excluded));
  }

  /**
   * Apply one random operation to the model and the project together.
   * @param source Deterministic source for this step.
   * @returns A label naming what the step did.
   */
  function mutate(source: Random): string {
    const label = step(source);
    sync();
    return label;
  }

  /**
   * Choose and apply one operation.
   * @param source Deterministic source for this step.
   * @returns A label naming what the step did.
   */
  function step(source: Random): string {
    const present = [...files.keys()];
    if (present.length === 0) return 'idle (no files left)';
    const path = source.pick(present);
    const file = files.get(path) as WorldFile;
    // Weighted rather than uniform, and every branch falls back to adding an
    // import rather than to excluding the file: an even spread spends most
    // scenarios tearing the world down, and a world with no edges left cannot
    // exercise a single rule about edges.
    const choice = source.int(12);
    if (choice === 4 || choice === 5) {
      if (file.live.length === 0) return addImport(source, path, file);
      const specifier = source.pick(file.live);
      file.live = file.live.filter((one) => one !== specifier);
      return `remove import ${specifier} from ${path}`;
    }
    if (choice === 6 || choice === 7) {
      if (file.live.length === 0) return addImport(source, path, file);
      const specifier = source.pick(file.live);
      file.live = file.live.filter((one) => one !== specifier);
      file.commented.push(specifier);
      return `comment out ${specifier} in ${path}`;
    }
    if (choice === 8) {
      if (file.commented.length === 0) return addImport(source, path, file);
      const specifier = source.pick(file.commented);
      file.commented = file.commented.filter((one) => one !== specifier);
      file.live.push(specifier);
      return `uncomment ${specifier} in ${path}`;
    }
    if (choice === 9) {
      noise += 1;
      const added = `src/noise${noise}.ts`;
      files.set(added, { live: [], commented: [] });
      everExisted.add(added);
      return `add ${added} (moves the epoch)`;
    }
    if (choice === 10 && present.length > 2) {
      files.delete(path);
      return `delete ${path}`;
    }
    if (choice === 11) {
      if (!excluded.includes(path)) excluded.push(path);
      return `exclude ${path} from the facts scope`;
    }
    return addImport(source, path, file);
  }

  /**
   * Add a live import of another file, if one is free.
   * @param source Deterministic source for this step.
   * @param path The importing file.
   * @param file Its model.
   * @returns A label naming what the step did.
   */
  function addImport(source: Random, path: string, file: WorldFile): string {
    const free = [...files.keys()]
      .filter((other) => other !== path)
      .map(specifierFor)
      .filter(
        (specifier) =>
          !file.live.includes(specifier) && !file.commented.includes(specifier),
      );
    if (free.length === 0) return `no import to add to ${path}`;
    const specifier = source.pick(free);
    file.live.push(specifier);
    return `add import ${specifier} to ${path}`;
  }

  /**
   * Build the records a tool would submit for the tree as it now stands.
   * @param mode Which modelled tool is reporting.
   * @param source Deterministic source, used to choose what a lossy tool drops.
   * @param only Paths to report on, or undefined for every file.
   * @returns One record per reported file, in path order.
   */
  function extract(
    mode: ToolMode,
    source: Random,
    only?: ReadonlySet<string>,
  ): FileFacts[] {
    const dropped = mode === 'lossy' ? dropOne(source) : null;
    return world.livePaths().filter((path) => only?.has(path) ?? true).map((path) => {
      const file = files.get(path) as WorldFile;
      const references = file.live
        .filter((specifier) => !(path === dropped?.path && specifier === dropped.specifier))
        .map((specifier) => {
          const target = world.targetOf(specifier);
          return {
            specifier,
            kind: 'static' as const,
            resolved:
              target === null ? { unresolved: true as const } : { path: target },
          };
        });
      return project.facts(path, {
        references,
        provenance: {
          ...TOOLS[mode],
          command: 'model',
          tier: 'tool' as const,
          resolutionInputs: [],
        },
      });
    });
  }

  /**
   * Pick one live reference for a lossy tool to leave out.
   * @param source Deterministic source for this extraction.
   * @returns The omitted reference, or null when there is none to omit.
   */
  function dropOne(
    source: Random,
  ): { path: string; specifier: string } | null {
    const candidates = world
      .livePaths()
      .flatMap((path) =>
        (files.get(path) as WorldFile).live.map((specifier) => ({
          path,
          specifier,
        })),
      );
    return candidates.length === 0 ? null : source.pick(candidates);
  }

  sync();
  return world;
}

/**
 * The specifier one file uses to import another.
 * @param path Project-relative path of the target.
 * @returns The relative specifier its importers spell.
 */
function specifierFor(path: string): string {
  return `./${path.slice('src/'.length).replace(/\.ts$/, '.js')}`;
}

/**
 * Render a modelled file's bytes.
 * @param file What the model says the file holds.
 * @returns Source text whose lines carry every modelled specifier.
 */
function render(file: WorldFile): string {
  const live = file.live.map(
    (specifier, index) => `import * as l${index} from '${specifier}';`,
  );
  const commented = file.commented.map(
    (specifier, index) => `// import * as c${index} from '${specifier}';`,
  );
  return `${[...live, ...commented, 'export const value = 1;'].join('\n')}\n`;
}

/**
 * The project configuration for a given set of excluded paths.
 * @param excluded Project-relative paths the facts scope no longer covers.
 * @returns The `.filid/config.json` body.
 */
function config(excluded: readonly string[]): string {
  return JSON.stringify({
    version: '2.0',
    adapters: { mode: 'auto', enabled: [] },
    rules: {},
    facts: { covers: ['src/**'], excludes: [...excluded] },
  });
}
