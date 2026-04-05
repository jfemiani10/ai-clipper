// transcriber.ts — Runs local Whisper CLI to transcribe audio to timestamped text.
//
// What is Whisper?
//   An open-source speech recognition model by OpenAI. It converts audio files
//   into text. The "local" version runs entirely on your machine — no API call,
//   no cost, no internet needed after the initial model download.
//
// How we use it:
//   We run the `whisper` CLI tool and ask for JSON output format.
//   The JSON contains each spoken segment with start/end timestamps in seconds,
//   which we need to tell Claude exactly where things were said.
//
// Model sizes (accuracy vs speed tradeoff):
//   tiny   (~75MB)  — fastest, lower accuracy
//   base   (~139MB) — good balance for most content       ← we use this
//   small  (~466MB) — better accuracy, noticeably slower
//   medium (~1.5GB) — high accuracy, slow on CPU
//   large  (~3GB)   — best accuracy, very slow without GPU

import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export interface TranscriptSegment {
  text: string;
  start: number; // seconds
  end: number;   // seconds
}

// The shape of a segment in Whisper's JSON output file
interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface WhisperOutput {
  segments: WhisperSegment[];
  text: string;
}

// Finds the whisper binary in ~/.local/bin (where pip --user installs scripts)
function getWhisperPath(): string {
  const candidates = [
    path.join(process.env.HOME ?? "", ".local", "bin", "whisper"),
    "whisper",
  ];
  for (const c of candidates) {
    if (!c.includes("/") || fs.existsSync(c)) return c;
  }
  throw new Error(
    "whisper not found. Install it with: pip install openai-whisper --user --break-system-packages"
  );
}

export async function transcribe(
  audioPath: string,
  outDir: string
): Promise<TranscriptSegment[]> {
  const whisper = getWhisperPath();

  await new Promise<void>((resolve, reject) => {
    const args = [
      audioPath,
      "--model", "base",              // small enough to download quickly, accurate enough for speech
      "--output_format", "json",      // we want structured data, not plain text
      "--output_dir", outDir,         // write the .json file alongside our other temp files
      "--language", "en",             // skip language detection — faster if you know it's English
                                      // remove this line if processing non-English videos
      "--fp16", "False",              // disable half-precision — required on CPU (no GPU available)
    ];

    const child = spawn(whisper, args, {
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
        // Tell Python where user-installed packages are
        PYTHONPATH: `${process.env.HOME}/.local/lib/python3.12/site-packages`,
      },
    });

    child.stdout.on("data", (chunk: Buffer) => {
      process.stdout.write(`[whisper] ${chunk.toString()}`);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      process.stderr.write(`[whisper] ${chunk.toString()}`);
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Whisper exited with code ${code}`));
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start whisper: ${err.message}`));
    });
  });

  // Whisper names the output file after the input file, e.g. audio.json
  const audioBasename = path.basename(audioPath, path.extname(audioPath));
  const jsonPath = path.join(outDir, `${audioBasename}.json`);

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Whisper completed but output file not found at: ${jsonPath}`);
  }

  const raw: WhisperOutput = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  // Map Whisper's segment format to our simpler TranscriptSegment type.
  // We trim whitespace from text because Whisper often adds a leading space.
  return raw.segments.map((seg) => ({
    text: seg.text.trim(),
    start: seg.start,
    end: seg.end,
  }));
}
