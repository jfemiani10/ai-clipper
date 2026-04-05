// GET /api/clips/:filename
//
// Serves a clip video file from the tmp/ directory to the browser.
// This is needed because the browser can't directly access files on the server's
// filesystem — they have to go through an HTTP endpoint.
//
// Adding ?download=1 to the URL sets Content-Disposition: attachment,
// which tells the browser to download the file instead of playing it inline.

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Security: strip any path traversal characters like "../../../etc/passwd"
  // path.basename removes all directory components, leaving just the filename.
  const safeName = path.basename(filename);

  // Clips are stored under tmp/{jobId}/clips/{filename}.
  // We search all job directories for a clip with this filename.
  const tmpDir = path.join(process.cwd(), "tmp");

  // Find which job directory contains this clip
  let clipPath: string | null = null;

  if (fs.existsSync(tmpDir)) {
    for (const jobId of fs.readdirSync(tmpDir)) {
      const candidate = path.join(tmpDir, jobId, "clips", safeName);
      if (fs.existsSync(candidate)) {
        clipPath = candidate;
        break;
      }
    }
  }

  if (!clipPath) {
    return NextResponse.json({ error: "Clip not found." }, { status: 404 });
  }

  // Read the file as a buffer and return it with the correct Content-Type
  const fileBuffer = fs.readFileSync(clipPath);

  const isDownload = req.nextUrl.searchParams.get("download") === "1";

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(fileBuffer.byteLength),
      // inline = play in browser; attachment = force download
      "Content-Disposition": isDownload
        ? `attachment; filename="${safeName}"`
        : `inline; filename="${safeName}"`,
    },
  });
}
