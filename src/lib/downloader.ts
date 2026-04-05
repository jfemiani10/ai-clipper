// downloader.ts — Downloads a YouTube video using yt-dlp.
//
// What is yt-dlp?
//   A command-line tool that can download videos from YouTube and 500+ other sites.
//   It's a fork of the older youtube-dl project, actively maintained and faster.
//   We call it from Node.js using child_process.spawn — the same way a terminal would.
//
// Why spawn() instead of exec()?
//   exec() buffers all output in memory before returning it.
//   spawn() streams output as it arrives, so we can read download progress in real time.
//   For large video files this matters — we don't want to buffer gigabytes in RAM.

import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// Finds the yt-dlp binary — checks PATH first, then the known install location.
// This handles both system-wide installs and the ~/.local/bin standalone binary.
function getYtDlpPath(): string {
  const candidates = [
    "yt-dlp",                                      // on PATH (e.g. via apt or pipx)
    path.join(process.env.HOME ?? "", ".local", "bin", "yt-dlp"), // standalone binary
  ];
  for (const c of candidates) {
    try {
      // If the path is absolute, check it exists. If it's just a name, trust PATH.
      if (!c.includes("/") || fs.existsSync(c)) return c;
    } catch {
      continue;
    }
  }
  throw new Error(
    "yt-dlp not found. Install it with: curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp && chmod +x ~/.local/bin/yt-dlp"
  );
}

// Downloads the best available mp4 (video + audio merged) to outDir/video.mp4.
// Returns the full path to the downloaded file.
export async function downloadVideo(url: string, outDir: string): Promise<string> {
  const ytDlp = getYtDlpPath();
  const outputPath = path.join(outDir, "video.mp4");

  return new Promise((resolve, reject) => {
    // yt-dlp flags explained:
    //   -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]"
    //       Download the best quality mp4 video track + best m4a audio track,
    //       then merge them. Falls back to the single best mp4 if separate tracks
    //       aren't available.
    //   --merge-output-format mp4
    //       Ensure the final merged file is always .mp4 regardless of source formats.
    //   -o <path>
    //       Output file path template.
    //   --no-playlist
    //       If the URL happens to be a playlist, only download the first video.
    //   --no-warnings
    //       Suppress non-critical warnings from cluttering logs.
    const args = [
      "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]",
      "--merge-output-format", "mp4",
      "-o", outputPath,
      "--no-playlist",
      "--no-warnings",
      url,
    ];

    const child = spawn(ytDlp, args, {
      // Pass the parent process's PATH so yt-dlp can find ffmpeg for merging
      env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` },
    });

    // Log stdout in real time (yt-dlp prints download progress here)
    child.stdout.on("data", (chunk: Buffer) => {
      process.stdout.write(`[yt-dlp] ${chunk.toString()}`);
    });

    // Log stderr (yt-dlp prints warnings/errors here)
    child.stderr.on("data", (chunk: Buffer) => {
      process.stderr.write(`[yt-dlp] ${chunk.toString()}`);
    });

    child.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(
          new Error(`yt-dlp exited with code ${code}. Is the URL valid and the video public?`)
        );
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start yt-dlp: ${err.message}`));
    });
  });
}
