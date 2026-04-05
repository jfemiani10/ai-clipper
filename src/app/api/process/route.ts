// POST /api/process
//
// This is the entry point for the entire pipeline.
// The frontend sends: { url: "https://youtube.com/..." }
// We respond immediately with: { jobId: "abc-123" }
// Then the pipeline runs in the background — the client polls /api/status/:jobId.
//
// Why return immediately instead of waiting?
//   Video processing takes 1–5 minutes. HTTP requests time out after ~30s in most
//   environments (Vercel, nginx, etc.). By returning a jobId right away, we never
//   hit that timeout. The client polls for updates instead.

import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/jobManager";
import { runPipeline } from "@/lib/pipeline";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url: string = body?.url ?? "";

  // Basic validation — is this a YouTube URL?
  if (!url || !isYouTubeUrl(url)) {
    return NextResponse.json(
      { error: "Please provide a valid YouTube URL." },
      { status: 400 }
    );
  }

  // Create the job record in memory and get back a unique ID
  const jobId = createJob();

  // Fire-and-forget: start the pipeline but do NOT await it.
  // The pipeline runs asynchronously in the background.
  // The `void` keyword here is intentional — it tells TypeScript and our
  // linter: "I know this returns a Promise and I'm deliberately not awaiting it."
  void runPipeline(jobId, url);

  // Return the jobId immediately so the client can start polling
  return NextResponse.json({ jobId }, { status: 202 }); // 202 Accepted = "started, not done yet"
}

function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "youtu.be"
    );
  } catch {
    return false;
  }
}
