/** Arguments of one `filid-facts` run. */
export interface ExtractorArguments {
  /** Project root as given. */
  root: string;
  /** Output file as given; it must lie outside the project tree. */
  out: string;
  /** File list path, or `-` for stdin. */
  filesFrom?: string;
  /** Extract every file the adapter's discovery selects. */
  all: boolean;
  /** Paths given as positional arguments. */
  files: string[];
}

/** A command line the program refuses, with the reason printed to stderr. */
export interface ExtractorUsageError {
  error: string;
}

/** Options that take a value, and the argument field each fills. */
const VALUE_OPTIONS = {
  '--root': 'root',
  '--out': 'out',
  '--files-from': 'filesFrom',
} as const;

/**
 * Parse the command line of `filid-facts`.
 *
 * `--root` and `--out` are required. The file list comes from positional
 * paths, `--files-from <path|->`, or `--all`; without any of them the program
 * refuses to pick a scope itself, and `--all` does not combine with a list.
 * @param argv Arguments after the script path.
 * @returns The parsed arguments, or the reason the command line is refused.
 */
export function parseExtractorArguments(
  argv: readonly string[],
): ExtractorArguments | ExtractorUsageError {
  const values: Partial<Record<'root' | 'out' | 'filesFrom', string>> = {};
  const files: string[] = [];
  let all = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--all') all = true;
    else if (argument in VALUE_OPTIONS) {
      const value = argv[index + 1];
      if (value === undefined) return { error: `${argument} needs a value.` };
      values[VALUE_OPTIONS[argument as keyof typeof VALUE_OPTIONS]] = value;
      index += 1;
    } else if (argument.startsWith('--'))
      return { error: `Unknown option ${argument}.` };
    else files.push(argument);
  }
  if (!values.root || !values.out)
    return {
      error: 'Both --root <project root> and --out <output file> are required.',
    };
  const listed = files.length > 0 || values.filesFrom !== undefined;
  if (all === listed)
    return {
      error: all
        ? '--all does not combine with a file list.'
        : 'Give the files to extract: paths, --files-from <path|->, or --all.',
    };
  return {
    root: values.root,
    out: values.out,
    filesFrom: values.filesFrom,
    all,
    files,
  };
}
