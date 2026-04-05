// GET /api/status/:jobId
//
// The frontend calls this every 2 seconds while processing.
// It returns the current JobState — status, step states, and clips when done.
//
// The [jobId] folder name uses Next.js dynamic route syntax.
// The bracket means "this segment of the URL is a variable".
// So /api/status/abc-123 → params.jobId = "abc-123"

import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobManager";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: `Job "${jobId}" not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json(job);
}
