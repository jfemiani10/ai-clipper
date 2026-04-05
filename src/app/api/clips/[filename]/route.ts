// GET /api/clips/:filename
//
// Streams a clip video file from tmp/ to the browser.
//
// Why streaming instead of readFileSync?
//   readFileSync loads the entire file into RAM before sending a single byte.
//   A 200MB clip would spike memory by 200MB per concurrent request.
//   Streaming sends the file in small chunks (64KB by default), keeping
//   memory flat regardless of file size — the way web servers are meant to work.
//
// Adding ?download=1 triggers Content-Disposition: attachment,
// which makes the browser save the file instead of playing it inline.

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Security: prevent path traversal attacks (e.g. ../../.env.local)
  const safeName = path.basename(filename);

  // Search all job directories for a clip with this filename
  const tmpDir = path.join(process.cwd(), "tmp");
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

  const stat = fs.statSync(clipPath);
  const isDownload = req.nextUrl.searchParams.get("download") === "1";

  // Create a Node.js ReadStream and convert it to a Web ReadableStream.
  // Next.js App Router works with the Web Streams API, not Node.js streams,
  // so we use Readable.toWeb() to bridge between the two.
  const nodeStream = fs.createReadStream(clipPath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stat.size),
      // Accept-Ranges tells the browser it can request specific byte ranges.
      // This is what enables seeking in the HTML5 video player — without it,
      // you can't skip ahead in a video without downloading everything before it.
      "Accept-Ranges": "bytes",
      "Content-Disposition": isDownload
        ? `attachment; filename="${safeName}"`
        : `inline; filename="${safeName}"`,
    },
  });
}
