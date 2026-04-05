// transcriber.ts — Runs local Whisper CLI to generate a timestamped transcript.
// Stub implementation — real logic added in Phase 5.

export interface TranscriptSegment {
  text: string;
  start: number; // seconds
  end: number;   // seconds
}

export async function transcribe(audioPath: string, outDir: string): Promise<TranscriptSegment[]> {
  // Will run `whisper audio.mp3 --output_format json` via child_process in Phase 5
  throw new Error("transcribe not yet implemented (Phase 5)");
}
