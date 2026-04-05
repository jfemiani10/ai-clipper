"use client";
// The entire page is a Client Component because it uses React state and effects.
// In Next.js App Router, files are Server Components by default.
// Adding "use client" opts this file into the browser runtime where useState works.

import { useState, useEffect, useRef } from "react";
import UrlInput from "@/components/UrlInput";
import ProcessingStatus from "@/components/ProcessingStatus";
import ClipCard from "@/components/ClipCard";
import { JobState, INITIAL_STEPS } from "@/lib/types";

// The four states the UI can be in at any time
type AppStatus = "idle" | "processing" | "done" | "error";

export default function Home() {
  // --- STATE ---
  // url: what the user typed in the input box
  const [url, setUrl] = useState("");

  // appStatus: drives which UI section is visible
  const [appStatus, setAppStatus] = useState<AppStatus>("idle");

  // job: the full job object polled from /api/status/:jobId
  const [job, setJob] = useState<JobState | null>(null);

  // jobId: the ID returned when we POST to /api/process
  const jobIdRef = useRef<string | null>(null);

  // pollingRef: holds the setInterval timer so we can cancel it
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- POLLING ---
  // When processing starts we poll /api/status/:jobId every 2 seconds.
  // useEffect with [appStatus] re-runs whenever the status changes.
  useEffect(() => {
    // Only poll while processing
    if (appStatus !== "processing") return;

    pollingRef.current = setInterval(async () => {
      const id = jobIdRef.current;
      if (!id) return;

      try {
        const res = await fetch(`/api/status/${id}`);
        const data: JobState = await res.json();
        setJob(data);

        // Stop polling when the job finishes (success or failure)
        if (data.status === "done") {
          clearInterval(pollingRef.current!);
          setAppStatus("done");
        } else if (data.status === "error") {
          clearInterval(pollingRef.current!);
          setAppStatus("error");
        }
      } catch {
        // Network errors shouldn't crash the app — just log and keep polling
        console.error("Polling error");
      }
    }, 2000); // every 2 seconds

    // Cleanup: cancel the interval if the component unmounts or status changes
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [appStatus]);

  // --- SUBMIT HANDLER ---
  async function handleSubmit() {
    setAppStatus("processing");
    // Show the steps immediately in pending state while we wait for the server
    setJob({ jobId: "", status: "processing", steps: INITIAL_STEPS, clips: [] });

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error("Failed to start processing");

      const { jobId } = await res.json();
      jobIdRef.current = jobId; // Store the ID so the polling useEffect can use it
    } catch (err) {
      setAppStatus("error");
      setJob((prev) => ({
        ...(prev ?? { jobId: "", status: "error", steps: INITIAL_STEPS, clips: [] }),
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }

  // Reset everything so the user can try a different video
  function handleReset() {
    setUrl("");
    setAppStatus("idle");
    setJob(null);
    jobIdRef.current = null;
  }

  // --- RENDER ---
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-3">
          AI Viral Moment Clipper
        </h1>
        <p className="text-gray-400 text-lg">
          Paste a YouTube link. We&apos;ll find the best moments and clip them for you.
        </p>
      </div>

      {/* Input card — always visible */}
      <div className="w-full max-w-2xl bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-800">
        <UrlInput
          url={url}
          onChange={setUrl}
          onSubmit={handleSubmit}
          isLoading={appStatus === "processing"}
        />
      </div>

      {/* Processing steps — shown while running or after error */}
      {(appStatus === "processing" || appStatus === "error") && job && (
        <ProcessingStatus steps={job.steps} error={job.error} />
      )}

      {/* Clips grid — shown when done */}
      {appStatus === "done" && job && job.clips.length > 0 && (
        <div className="w-full max-w-4xl mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {job.clips.length} Viral Clip{job.clips.length !== 1 ? "s" : ""} Found
            </h2>
            <button
              onClick={handleReset}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition"
            >
              Try another video →
            </button>
          </div>

          {/* Responsive grid: 1 column on mobile, 2 on larger screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {job.clips.map((clip, i) => (
              <ClipCard key={clip.filename} clip={clip} index={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Footer hint */}
      {appStatus === "idle" && (
        <p className="mt-8 text-gray-600 text-sm">
          Processing takes 1–3 minutes depending on video length.
        </p>
      )}
    </main>
  );
}
