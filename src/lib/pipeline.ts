// pipeline.ts — Orchestrates the full processing pipeline for one job.
//
// This file is the "conductor": it calls each processing step in order,
// updates the job's step statuses, and handles errors gracefully.
//
// Each step (download, transcribe, analyze, clip) lives in its own file
// in src/lib/ — the pipeline just wires them together.
//
// We run this ASYNC and fire-and-forget from the API route.
// That means the HTTP response returns immediately with a jobId,
// and this function keeps running in the Node.js event loop in the background.

import { updateStep, completeJob, failJob } from "./jobManager";
import fs from "fs";
import path from "path";

// Helper: mark a step active, run work, mark it done — or mark it error on throw.
// This pattern avoids repeating try/catch in every step.
async function runStep<T>(
  jobId: string,
  stepId: string,
  fn: () => Promise<T>
): Promise<T> {
  updateStep(jobId, stepId, "active");
  try {
    const result = await fn();
    updateStep(jobId, stepId, "done");
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failJob(jobId, stepId, `Step "${stepId}" failed: ${message}`);
    throw err; // Re-throw so the outer try/catch in runPipeline stops execution
  }
}

export async function runPipeline(jobId: string, youtubeUrl: string): Promise<void> {
  // The working directory for this job's temp files
  const jobDir = path.join(process.cwd(), "tmp", jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  try {
    // ── Step 1: Download ─────────────────────────────────────────────
    // Imports are lazy (inside the function) to keep startup fast and
    // make each module easy to replace independently later.
    const { downloadVideo } = await import("./downloader");
    const videoPath = await runStep(jobId, "download", () =>
      downloadVideo(youtubeUrl, jobDir)
    );

    // ── Step 2: Extract audio ────────────────────────────────────────
    const { extractAudio } = await import("./clipper");
    const audioPath = await runStep(jobId, "audio", () =>
      extractAudio(videoPath, jobDir)
    );

    // ── Step 3: Transcribe ───────────────────────────────────────────
    const { transcribe } = await import("./transcriber");
    const segments = await runStep(jobId, "transcribe", () =>
      transcribe(audioPath, jobDir)
    );

    // ── Step 4: Analyze ──────────────────────────────────────────────
    const { findViralMoments } = await import("./analyzer");
    const moments = await runStep(jobId, "analyze", () =>
      findViralMoments(segments)
    );

    // ── Step 5: Cut clips ────────────────────────────────────────────
    const { cutClips } = await import("./clipper");
    const clips = await runStep(jobId, "clip", () =>
      cutClips(videoPath, moments, jobDir)
    );

    completeJob(jobId, clips);
  } catch {
    // failJob was already called inside runStep — nothing more to do here.
    // The error is already reflected in the job state for the frontend to read.
  }
}
