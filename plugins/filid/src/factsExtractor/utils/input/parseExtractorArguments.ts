/** Arguments of one `filid-facts` run. */
export interface ExtractorArguments {
  /** Project root as given. */
  root: string;
  /** Output file as given; it must lie outside the project tree. */
  out: string;
  /** File list path, or `-` for stdin. */
  filesFrom?: string;
  /** One share of the list: its index and how many shares the list is cut into. */
  part?: { index: number; count: number };
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
  '--part': 'part',
} as const;

/** `i/n` with both sides whole and `1 <= i <= n`. */
const PART_PATTERN = /^(\d+)\/(\d+)$/;

/**
 * Read one `--part i/n` value.
 * @param value The option's raw text.
 * @returns The share, or null when the text is not a usable `i/n`.
 */
function parsePart(value: string): { index: number; count: number } | null {
  const matched = PART_PATTERN.exec(value);
  if (!matched) return null;
  const index = Number(matched[1]);
  const count = Number(matched[2]);
  if (count < 1 || index < 1 || index > count) return null;
  return { index, count };
}

/**
 * Parse the command line of `filid-facts`.
 *
 * `--root` and `--out` are required. The file list comes from positional
 * paths or `--files-from <path|->`; without either the program refuses to pick
 * a scope itself, because the server owns it and names the list to read.
 */
export function parseExtractorArguments(
  argv: readonly string[],
): ExtractorArguments | ExtractorUsageError {
  const values: Partial<Record<'root' | 'out' | 'filesFrom' | 'part', string>> =
    {};
  const files: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (Object.hasOwn(VALUE_OPTIONS, argument)) {
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
  const part = values.part === undefined ? undefined : parsePart(values.part);
  if (values.part !== undefined && !part)
    return {
      error: `--part ${values.part} is not i/n with whole numbers and 1 <= i <= n.`,
    };
  if (files.length === 0 && values.filesFrom === undefined)
    return {
      error:
        'Give the files to extract: paths, or --files-from <path|-> with the list facts status names in extractionList.path.',
    };
  return {
    root: values.root,
    out: values.out,
    filesFrom: values.filesFrom,
    ...(part ? { part } : {}),
    files,
  };
}
