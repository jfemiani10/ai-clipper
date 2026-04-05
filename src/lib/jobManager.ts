// jobManager.ts — In-memory store for tracking processing jobs.
//
// Why in-memory?
//   For an MVP, storing jobs in a JavaScript Map is the simplest approach.
//   We don't need a database for state that only lives during a single processing
//   session (a few minutes). The downside is that jobs are lost if the server
//   restarts — good enough for local use.
//
// Why not just use a database?
//   We could use Redis, SQLite, or Postgres for persistence, but that adds
//   significant setup complexity. In-memory keeps the MVP simple and teachable.
//   When you're ready to deploy, swapping this out for Redis is straightforward.

import { JobState, ProcessingStep, Clip, INITIAL_STEPS } from "./types";
import { randomUUID } from "crypto"; // Node.js built-in — generates a unique ID like "a1b2c3d4-..."

// The central store: a Map from jobId string → JobState object.
// Map is used instead of a plain object because it has better performance
// for frequent inserts/lookups and cleaner iteration.
const jobs = new Map<string, JobState>();

// --- CREATE ---
// Called when a new YouTube URL is submitted.
// Returns the new jobId so the frontend can start polling.
export function createJob(): string {
  const jobId = randomUUID();

  // Deep-clone INITIAL_STEPS so each job gets its own independent copy
  // (we'll be mutating the steps array as the job progresses)
  const steps: ProcessingStep[] = INITIAL_STEPS.map((s) => ({ ...s }));

  jobs.set(jobId, {
    jobId,
    status: "pending",
    steps,
    clips: [],
  });

  return jobId;
}

// --- READ ---
// Called by the polling endpoint GET /api/status/:jobId
export function getJob(jobId: string): JobState | undefined {
  return jobs.get(jobId);
}

// --- UPDATE STATUS ---
// Flips the top-level job status (pending → processing → done/error).
export function updateJobStatus(jobId: string, status: JobState["status"]): void {
  const job = jobs.get(jobId);
  if (job) job.status = status;
}

// --- UPDATE STEP ---
// Marks a specific pipeline step as active, done, or error.
// The stepId matches the `id` fields in INITIAL_STEPS (e.g. "download", "audio").
export function updateStep(jobId: string, stepId: string, status: ProcessingStep["status"]): void {
  const job = jobs.get(jobId);
  if (!job) return;

  const step = job.steps.find((s) => s.id === stepId);
  if (step) step.status = status;
}

// --- COMPLETE JOB ---
// Called when all pipeline steps finish successfully.
export function completeJob(jobId: string, clips: Clip[]): void {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "done";
  job.clips = clips;
}

// --- FAIL JOB ---
// Called when any pipeline step throws an error.
export function failJob(jobId: string, stepId: string, errorMessage: string): void {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "error";
  job.error = errorMessage;

  // Mark the failing step as error so the UI shows a red X on the right step
  updateStep(jobId, stepId, "error");
}

// --- CLEANUP ---
// Deletes a job from memory. Called after the temp files are also deleted.
// Prevents the Map from growing forever on a long-running server.
export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}
