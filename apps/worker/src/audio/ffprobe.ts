import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

type ProbeOptions = {
  // Injected in tests.
  ffprobePath?: string;
  timeoutMs?: number;
};

// How long `source` (a URL or a file path) plays, in ms, from its container's
// header. Reads only the start of the file. Undefined when ffprobe can't tell
// (a stream without a length, a file it can't read): the caller carries on
// without it.
export async function probeDurationMs(
  source: string,
  { ffprobePath = 'ffprobe', timeoutMs = 30_000 }: ProbeOptions = {},
): Promise<number | undefined> {
  try {
    const { stdout } = await run(
      ffprobePath,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        source,
      ],
      { timeout: timeoutMs },
    );
    const seconds = Number.parseFloat(stdout.trim());
    return Number.isFinite(seconds) && seconds > 0
      ? Math.round(seconds * 1000)
      : undefined;
  } catch {
    return undefined;
  }
}
