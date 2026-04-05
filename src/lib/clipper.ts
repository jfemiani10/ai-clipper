// clipper.ts — Uses ffmpeg to extract audio from video and cut clips.
//
// What is ffmpeg?
//   A command-line tool that can decode, encode, transcode, mux, demux,
//   stream, filter and play almost any audio/video format. It's the
//   industry-standard tool that powers most video software behind the scenes.
//
// We use it for two jobs:
//   1. Extract audio from the downloaded video (for Whisper to transcribe)
//   2. Cut short clips from the original video based on AI timestamps

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { ViralMoment } from "./analyzer";
import { Clip } from "./types";

// Finds ffmpeg binary — checks PATH and ~/.local/bin (our static install location).
function getFfmpegPath(): string {
  const candidates = [
    path.join(process.env.HOME ?? "", ".local", "bin", "ffmpeg"),
    "ffmpeg",
  ];
  for (const c of candidates) {
    if (!c.includes("/") || fs.existsSync(c)) return c;
  }
  throw new Error("ffmpeg not found. See README for installation instructions.");
}

// Runs an ffmpeg command and returns a Promise that resolves when it exits 0.
// This is a generic helper used by both extractAudio() and cutClips().
function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = getFfmpegPath();

    const child = spawn(ffmpeg, args, {
      env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` },
    });

    // ffmpeg writes progress to stderr by default (not stdout)
    child.stderr.on("data", (chunk: Buffer) => {
      process.stderr.write(`[ffmpeg] ${chunk.toString()}`);
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`));
    });
  });
}

// ── AUDIO EXTRACTION ────────────────────────────────────────────────────────
// Takes the downloaded video.mp4 and strips out just the audio as a .mp3 file.
// Whisper works on audio — it doesn't need the video frames, which would just
// slow things down and use more memory.
export async function extractAudio(videoPath: string, outDir: string): Promise<string> {
  const audioPath = path.join(outDir, "audio.mp3");

  await runFfmpeg([
    "-i", videoPath,          // input file
    "-vn",                    // -vn = "no video" — drop the video stream entirely
    "-ar", "16000",           // sample rate 16kHz — Whisper's native sample rate, saves file size
    "-ac", "1",               // mono audio — Whisper doesn't use stereo, halves the file size
    "-b:a", "64k",            // 64kbps bitrate — enough for speech, very small file
    "-y",                     // overwrite output file if it already exists
    audioPath,
  ]);

  return audioPath;
}

// ── CLIP CUTTING ─────────────────────────────────────────────────────────────
// For each viral moment found by Claude, cut a separate mp4 clip from the
// original video using the start/end timestamps.
export async function cutClips(
  videoPath: string,
  moments: ViralMoment[],
  outDir: string
): Promise<Clip[]> {
  const clipsDir = path.join(outDir, "clips");
  fs.mkdirSync(clipsDir, { recursive: true });

  const clips: Clip[] = [];

  for (let i = 0; i < moments.length; i++) {
    const moment = moments[i];
    const filename = `clip_${i + 1}.mp4`;
    const clipPath = path.join(clipsDir, filename);

    await runFfmpeg([
      // IMPORTANT: -ss BEFORE -i for fast seeking.
      // If you put -ss after -i, ffmpeg decodes every frame from the start — very slow.
      // Putting it before -i tells ffmpeg to jump directly to that position.
      "-ss", String(moment.start_time),
      "-to", String(moment.end_time),
      "-i", videoPath,
      "-c", "copy",   // "copy" = don't re-encode, just copy the existing streams.
                      // This is near-instant and lossless. The alternative -c:v libx264
                      // would re-encode and take much longer.
      "-avoid_negative_ts", "make_zero", // fixes timestamp issues when seeking into the middle
      "-y",
      clipPath,
    ]);

    clips.push({
      title: moment.title,
      reason: moment.reason,
      start_time: moment.start_time,
      end_time: moment.end_time,
      filename,
    });
  }

  return clips;
}
