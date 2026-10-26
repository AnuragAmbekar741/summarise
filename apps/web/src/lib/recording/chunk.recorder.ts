// Records the microphone as a series of standalone audio files ("chunks"),
// each cut at a pause in speech so no word is split between two of them.

// Formats the service accepts, best first. Safari only records mp4.
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4'];
const AUDIO_BITS_PER_SECOND = 32_000;

// A chunk is cut at the first quiet moment after CUT_AFTER_MS, or at
// MAX_CHUNK_MS if the speaker never pauses.
const CUT_AFTER_MS = 25_000;
const MAX_CHUNK_MS = 35_000;
// How quiet, and for how long, counts as a pause. Tuned by ear.
const SILENCE_DB = -45;
const QUIET_TO_CUT_MS = 300;
// setInterval keeps running in a background tab (requestAnimationFrame
// would stop), though the browser may slow it to once a second there.
const TICK_MS = 100;
// Anything shorter, e.g. Pause right after Resume, is not worth sending.
const MIN_CHUNK_MS = 1_000;

export type RecordedChunk = {
  // Recording time, which skips pauses: chunk 2 starts where chunk 1 ended.
  startMs: number;
  durationMs: number;
  audio: Blob;
};

export type RecorderState = 'idle' | 'recording' | 'paused' | 'stopped';

type ChunkRecorderOptions = {
  // Called once per chunk, in order. The next chunk waits for it to finish.
  onChunk: (chunk: RecordedChunk) => Promise<void> | void;
  // Recording time so far, when carrying on a recording after a reload.
  elapsedMs?: number;
  // Called after the recorder paused itself because the mic went away
  // (unplugged, Bluetooth dropped, permission revoked).
  onInterrupted?: () => void;
};

type Mic = {
  stream: MediaStream;
  context: AudioContext;
  analyser: AnalyserNode;
  samples: Float32Array<ArrayBuffer>;
};

type Segment = {
  recorder: MediaRecorder;
  parts: Blob[];
  startMs: number;
  startedAt: number;
  // Resolves on the recorder's stop event, whoever stopped it.
  stopped: Promise<void>;
};

export function isRecordingSupported() {
  return (
    typeof MediaRecorder !== 'undefined' &&
    navigator.mediaDevices?.getUserMedia !== undefined &&
    pickMimeType() !== undefined
  );
}

export function createChunkRecorder({
  onChunk,
  elapsedMs: initialElapsedMs = 0,
  onInterrupted,
}: ChunkRecorderOptions) {
  const mimeType = pickMimeType();
  if (!mimeType) throw new Error("This browser can't record audio");

  let state: RecorderState = 'idle';
  let mic: Mic | undefined;
  let segment: Segment | undefined;
  let elapsedBeforeSegment = initialElapsedMs;
  let quietMs = 0;
  let lastTickAt = 0;
  let ticker: ReturnType<typeof setInterval> | undefined;
  // Each finished chunk is handed to onChunk after the one before it.
  let delivering: Promise<void> = Promise.resolve();

  function elapsedMs() {
    if (!segment) return elapsedBeforeSegment;
    return elapsedBeforeSegment + (performance.now() - segment.startedAt);
  }

  // Each chunk gets its own MediaRecorder, so each is a complete file with
  // its own headers that can be transcribed on its own.
  function beginSegment(stream: MediaStream) {
    const recorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });
    const parts: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) parts.push(event.data);
    };
    // Listening from the start, so a stop the browser does on its own (the
    // mic went away) is not missed.
    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
    });
    recorder.start();
    segment = {
      recorder,
      parts,
      startMs: elapsedBeforeSegment,
      startedAt: performance.now(),
      stopped,
    };
    quietMs = 0;
    lastTickAt = segment.startedAt;
  }

  function endSegment() {
    if (!segment) return;
    const { recorder, parts, startMs, startedAt, stopped } = segment;
    const durationMs = Math.round(performance.now() - startedAt);
    elapsedBeforeSegment = startMs + durationMs;
    segment = undefined;

    // Already stopped if the mic went away; its audio is in parts by now,
    // because the last data arrives just before the stop event.
    if (recorder.state !== 'inactive') recorder.stop();

    delivering = delivering
      .then(async () => {
        await stopped;
        if (durationMs < MIN_CHUNK_MS) return;
        const audio = new Blob(parts, { type: recorder.mimeType || mimeType });
        await onChunk({ startMs, durationMs, audio });
      })
      .catch((error: unknown) => {
        console.error('Could not save a recorded chunk', error);
      });
  }

  // The next chunk starts right away, on the same microphone stream.
  function cut() {
    if (!mic) return;
    endSegment();
    beginSegment(mic.stream);
  }

  function tick() {
    if (!segment || !mic) return;
    const now = performance.now();
    const age = now - segment.startedAt;
    const sinceLastTick = now - lastTickAt;
    lastTickAt = now;

    if (age >= MAX_CHUNK_MS) return cut();
    if (age < CUT_AFTER_MS) return;
    quietMs = levelDb(mic) < SILENCE_DB ? quietMs + sinceLastTick : 0;
    if (quietMs >= QUIET_TO_CUT_MS) cut();
  }

  // Start and Resume are the same: open the mic and begin a new chunk.
  async function record() {
    if (state !== 'idle' && state !== 'paused') return;
    const previous = state;
    state = 'recording';

    let opened: Mic;
    try {
      opened = await openMic();
    } catch (error) {
      state = previous;
      throw error;
    }
    // Paused or stopped while the browser was asking for the mic.
    if (state !== 'recording') return closeMic(opened);

    mic = opened;
    // Fires only when the browser ends the track, not when we stop it.
    mic.stream
      .getAudioTracks()[0]
      ?.addEventListener('ended', onMicLost, { once: true });
    beginSegment(mic.stream);
    ticker = setInterval(tick, TICK_MS);
  }

  // Same as the user pressing Pause: keep what was recorded, free the mic.
  function onMicLost() {
    if (state !== 'recording') return;
    void pause().then(() => onInterrupted?.());
  }

  // Cuts the current chunk now, not at a pause, and turns the mic off so
  // the browser's recording indicator goes away.
  async function release() {
    clearInterval(ticker);
    // Taken before waiting: a quick Resume may open a new mic meanwhile,
    // and that one must stay open.
    const current = mic;
    mic = undefined;
    endSegment();
    await delivering;
    if (current) closeMic(current);
  }

  async function pause() {
    if (state !== 'recording') return;
    state = 'paused';
    await release();
  }

  // Resolves once the last chunk has been passed to onChunk.
  async function stop() {
    if (state === 'stopped') return;
    state = 'stopped';
    await release();
  }

  return {
    start: record,
    resume: record,
    pause,
    stop,
    elapsedMs,
    state: () => state,
  };
}

export type ChunkRecorder = ReturnType<typeof createChunkRecorder>;

function pickMimeType() {
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

async function openMic(): Promise<Mic> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const context = new AudioContext();
  await context.resume();
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  context.createMediaStreamSource(stream).connect(analyser);
  return {
    stream,
    context,
    analyser,
    samples: new Float32Array(analyser.fftSize),
  };
}

function closeMic(mic: Mic) {
  for (const track of mic.stream.getTracks()) track.stop();
  void mic.context.close();
}

// Loudness of the last few milliseconds, in dB below full scale (0 is the
// loudest possible, speech is roughly -30 to -15, a quiet room below -50).
function levelDb({ analyser, samples }: Mic) {
  analyser.getFloatTimeDomainData(samples);
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const rms = Math.sqrt(sum / samples.length);
  return 20 * Math.log10(rms || 1e-8);
}
