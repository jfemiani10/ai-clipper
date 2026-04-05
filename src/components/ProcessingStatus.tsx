"use client";

import { ProcessingStep, StepStatus } from "@/lib/types";

interface ProcessingStatusProps {
  steps: ProcessingStep[];
  error?: string;
}

// Maps each status to its visual indicator
function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      // Green checkmark for completed steps
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold">
        ✓
      </span>
    );
  }
  if (status === "active") {
    return (
      // Spinning indigo circle for the currently running step
      <span className="flex items-center justify-center w-6 h-6">
        <svg className="animate-spin h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </span>
    );
  }
  if (status === "error") {
    return (
      // Red X for failed steps
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
        ✗
      </span>
    );
  }
  // Gray dot for steps not yet started
  return (
    <span className="flex items-center justify-center w-6 h-6 rounded-full border border-gray-600">
      <span className="w-2 h-2 rounded-full bg-gray-600" />
    </span>
  );
}

// Maps status to the label's text color
const labelColor: Record<StepStatus, string> = {
  pending: "text-gray-500",
  active:  "text-indigo-300 font-medium",
  done:    "text-green-400",
  error:   "text-red-400",
};

export default function ProcessingStatus({ steps, error }: ProcessingStatusProps) {
  return (
    <div className="w-full max-w-2xl mt-8">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
        Processing
      </h2>

      {/* One row per pipeline step */}
      <div className="flex flex-col gap-3">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            <StepIcon status={step.status} />
            <span className={`text-sm ${labelColor[step.status]}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Error message shown below the steps if something failed */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
