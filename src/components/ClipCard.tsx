"use client";

import { Clip } from "@/lib/types";

interface ClipCardProps {
  clip: Clip;
  index: number; // Clip number (1, 2, 3…) shown in the header
}

// Converts seconds to a readable "mm:ss" timestamp string
// e.g. 90 → "1:30"
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ClipCard({ clip, index }: ClipCardProps) {
  const duration = Math.round(clip.end_time - clip.start_time);

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-lg">
      {/* Video Player — src points to our /api/clips/:filename route (built in Phase 7) */}
      <div className="w-full aspect-video bg-gray-800 flex items-center justify-center">
        <video
          src={`/api/clips/${clip.filename}`}
          controls
          className="w-full h-full object-contain"
          preload="metadata" // Only loads enough to show the first frame — saves bandwidth
        />
      </div>

      {/* Card body */}
      <div className="p-5 flex flex-col gap-3">
        {/* Clip number badge + title */}
        <div className="flex items-start gap-3">
          <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold">
            {index}
          </span>
          <h3 className="text-white font-semibold leading-snug">{clip.title}</h3>
        </div>

        {/* Why Claude picked this moment */}
        <p className="text-gray-400 text-sm leading-relaxed">{clip.reason}</p>

        {/* Timestamp row */}
        <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
          <span>{formatTime(clip.start_time)} → {formatTime(clip.end_time)}</span>
          <span>{duration}s</span>
        </div>

        {/* Download button
            ?download=1 triggers Content-Disposition: attachment in our API route,
            which forces the browser to save the file instead of trying to play it.
            This is more reliable than the HTML `download` attribute, which some
            browsers ignore for non-same-origin or streaming responses. */}
        <a
          href={`/api/clips/${clip.filename}?download=1`}
          className="
            mt-1 w-full py-2.5 rounded-xl text-center
            bg-gray-800 hover:bg-gray-700 border border-gray-700
            text-white text-sm font-medium
            transition
          "
        >
          Download clip
        </a>
      </div>
    </div>
  );
}
