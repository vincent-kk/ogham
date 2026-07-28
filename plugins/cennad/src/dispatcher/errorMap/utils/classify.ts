import { ErrorCode } from '../../../types/index.js';
import { EXIT_CODE_MAP, SPAWN_ERROR_MAP } from '../constants/codeMaps.js';

export interface MapErrorInput {
  exitCode: number;
  stderr: string;
  // Failure text the CLI reported through its structured output rather than
  // stderr (codex puts it in the JSONL stream and leaves stderr to incidental
  // notices). Classified alongside stderr, and preferred as the message.
  cliMessage?: string | null;
  spawnError?: NodeJS.ErrnoException | null;
  abortedByCaller?: boolean;
}

export function classify(input: MapErrorInput): ErrorCode {
  if (EXIT_CODE_MAP[input.exitCode]) return EXIT_CODE_MAP[input.exitCode];
  const reported = `${input.cliMessage ?? ''}\n${input.stderr}`;
  if (/\b(401|403)\b/.test(reported)) return ErrorCode.Auth;
  // agy authenticates via Google OAuth (no API key); surface its sign-in
  // prompts as auth so skills can route to the login flow.
  if (
    /\b(sign[ -]?in|not authenticated|unauthenticated|oauth|login required|please log in)\b/i.test(
      reported,
    )
  )
    return ErrorCode.Auth;
  if (
    /\b429\b|\bRESOURCE_EXHAUSTED\b|\bquota\b|rate[\s_-]?limit|usage limit|exhausted your capacity/i.test(
      reported,
    )
  )
    return ErrorCode.RateLimit;
  if (
    /flags? provided but not defined|unknown (flag|subcommand)|not defined: -|invalid model selection/i.test(
      reported,
    )
  )
    return ErrorCode.CliError;
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(reported))
    return ErrorCode.Network;
  if (input.abortedByCaller) return ErrorCode.RateLimit;
  if (input.spawnError)
    return SPAWN_ERROR_MAP[input.spawnError.code ?? ''] ?? ErrorCode.Unknown;
  return ErrorCode.Unknown;
}
