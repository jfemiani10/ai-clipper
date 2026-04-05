// analyzer.ts — Sends the transcript to Claude and gets back viral moment timestamps.
// Stub implementation — real logic added in Phase 6.

import { TranscriptSegment } from "./transcriber";

export interface ViralMoment {
  title: string;
  start_time: number;
  end_time: number;
  reason: string;
}

export async function findViralMoments(segments: TranscriptSegment[]): Promise<ViralMoment[]> {
  // Will call Claude claude-sonnet-4-6 via @anthropic-ai/sdk in Phase 6
  throw new Error("findViralMoments not yet implemented (Phase 6)");
}
