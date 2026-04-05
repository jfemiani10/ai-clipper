// pipeline.ts — Orchestrates the full processing pipeline for one job.

import { updateStep, completeJob, failJob, updateJobStatus, deleteJob } from "./jobManager";
import fs from "fs";
import path from "path";

const CLEANUP_DELAY_MS = 60 * 60 * 1000; // 1 hour — delete temp files after this long

// Helper: mark a step active, run work, mark it done — or mark it error on throw.
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
    throw err;
  }
}

// Deletes the job's temp directory and removes it from the in-memory store.
// Called automatically 1 hour after the job finishes (success or failure).
function scheduleCleanup(jobId: string): void {
  setTimeout(() => {
    const jobDir = path.join(process.cwd(), "tmp", jobId);
    try {
      fs.rmSync(jobDir, { recursive: true, force: true });
      console.log(`[cleanup] Deleted temp files for job ${jobId}`);
    } catch (err) {
      console.error(`[cleanup] Failed to delete ${jobDir}:`, err);
    }
    deleteJob(jobId);
  }, CLEANUP_DELAY_MS);
}

export async function runPipeline(jobId: string, youtubeUrl: string): Promise<void> {
  const jobDir = path.join(process.cwd(), "tmp", jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  // Flip status to "processing" immediately so the frontend sees it change
  // from "pending" as soon as the pipeline actually starts running.
  updateJobStatus(jobId, "processing");

  try {
    // ── Step 1: Download ─────────────────────────────────────────────
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
    // failJob was already called inside runStep with the specific step error.
    // Nothing more to do — the job state is already set to "error".
  } finally {
    // Always schedule cleanup, whether the job succeeded or failed.
    // We still want temp files gone after 1 hour even on error.
    scheduleCleanup(jobId);
  }
}
