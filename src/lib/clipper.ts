// clipper.ts — Uses ffmpeg to extract audio and cut video clips.
// Stub implementation — real logic added in Phase 7.

import { ViralMoment } from "./analyzer";
import { Clip } from "./types";

export async function extractAudio(videoPath: string, outDir: string): Promise<string> {
  // Will run `ffmpeg -i video.mp4 -vn audio.mp3` in Phase 7
  throw new Error("extractAudio not yet implemented (Phase 5)");
}

export async function cutClips(
  videoPath: string,
  moments: ViralMoment[],
  outDir: string
): Promise<Clip[]> {
  // Will run `ffmpeg -ss {start} -to {end} -i video.mp4 clip_N.mp4` for each moment in Phase 7
  throw new Error("cutClips not yet implemented (Phase 7)");
}
