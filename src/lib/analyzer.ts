// analyzer.ts — Sends the transcript to Claude and gets back viral moment timestamps.
//
// What this does:
//   We take the array of timestamped transcript segments from Whisper and format
//   them into a prompt. Claude reads the transcript and identifies the 3-5 moments
//   most likely to go viral — things that are surprising, funny, emotionally resonant,
//   or debate-worthy. It returns those moments as structured JSON with timestamps.
//
// Why Claude for this?
//   Identifying "viral potential" requires understanding context, humor, surprise,
//   and cultural relevance — things that rule-based approaches can't do well.
//   Claude can read the transcript like a human editor would and reason about
//   what would make someone stop scrolling.

import Anthropic from "@anthropic-ai/sdk";
import { TranscriptSegment } from "./transcriber";

export interface ViralMoment {
  title: string;       // short punchy title for the clip, e.g. "The $10k mistake"
  start_time: number;  // seconds — where to start cutting
  end_time: number;    // seconds — where to stop cutting
  reason: string;      // why Claude thinks this moment is viral
}

// Formats our transcript segments into a readable block for the prompt.
// Each line looks like: [0:32 - 0:45] And that's when everything went wrong.
function formatTranscript(segments: TranscriptSegment[]): string {
  return segments
    .map((seg) => {
      const start = formatTime(seg.start);
      const end = formatTime(seg.end);
      return `[${start} - ${end}] ${seg.text}`;
    })
    .join("\n");
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Parses Claude's response — tries JSON first, then falls back to regex extraction.
// This makes the function resilient to Claude wrapping JSON in markdown code blocks.
function parseViralMoments(content: string): ViralMoment[] {
  // Strip markdown code fences if present: ```json ... ```
  const stripped = content.replace(/```(?:json)?\n?/g, "").trim();

  try {
    const parsed = JSON.parse(stripped);
    // Handle both a bare array and { moments: [...] }
    const arr = Array.isArray(parsed) ? parsed : parsed.moments ?? parsed.clips ?? [];
    return arr.map((m: Record<string, unknown>) => ({
      title: String(m.title ?? "Viral Moment"),
      start_time: Number(m.start_time ?? 0),
      end_time: Number(m.end_time ?? 0),
      reason: String(m.reason ?? ""),
    }));
  } catch {
    throw new Error(
      `Claude returned invalid JSON. Raw response:\n${content.slice(0, 500)}`
    );
  }
}

export async function findViralMoments(
  segments: TranscriptSegment[]
): Promise<ViralMoment[]> {
  // Guard: if the transcript is empty, there's nothing to analyze
  if (segments.length === 0) {
    throw new Error("Transcript is empty — Whisper produced no segments.");
  }

  const client = new Anthropic({
    // Reads ANTHROPIC_API_KEY from the environment automatically.
    // Next.js loads .env.local into process.env at startup.
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const transcript = formatTranscript(segments);

  // Total duration from the last segment
  const totalDuration = segments[segments.length - 1].end;

  const prompt = `You are an expert social media video editor. Your job is to identify the most viral-worthy moments from a video transcript.

Below is a timestamped transcript of a video. Read it carefully and identify the 3 to 5 moments that would perform best as short clips on social media (TikTok, YouTube Shorts, Instagram Reels).

Look for moments that are:
- Surprising, shocking, or counterintuitive
- Emotionally resonant (funny, inspiring, sad, infuriating)
- Quotable — a single punchy line people would screenshot
- Debate-worthy — something people would argue about in the comments
- Revelatory — a fact, story, or insight that makes you say "I didn't know that"

IMPORTANT RULES:
- Each clip must be between 30 and 90 seconds long
- start_time and end_time must be exact numbers in seconds (not mm:ss format)
- Do not start a clip at the very beginning or end it at the very end of the video
- The video is ${Math.round(totalDuration)} seconds long total
- You MUST return ONLY a valid JSON array — no explanation, no markdown, no extra text

Return this exact JSON structure:
[
  {
    "title": "Short punchy title (max 8 words)",
    "start_time": 42,
    "end_time": 98,
    "reason": "One sentence explaining why this moment is viral"
  }
]

TRANSCRIPT:
${transcript}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract the text content from Claude's response.
  // message.content is an array of content blocks — we want the first text block.
  const firstBlock = message.content[0];
  if (firstBlock.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  const moments = parseViralMoments(firstBlock.text);

  // Sanity-check: make sure every moment has valid timestamps
  const valid = moments.filter(
    (m) =>
      m.start_time >= 0 &&
      m.end_time > m.start_time &&
      m.end_time <= totalDuration + 5 // allow 5s tolerance for rounding
  );

  if (valid.length === 0) {
    throw new Error("Claude returned moments with invalid timestamps.");
  }

  return valid;
}
