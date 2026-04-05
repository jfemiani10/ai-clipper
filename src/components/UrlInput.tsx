"use client"; // This component uses browser-only APIs (state, events) — must be a Client Component

interface UrlInputProps {
  url: string;                        // The current value of the text input
  onChange: (url: string) => void;    // Called every time the user types
  onSubmit: () => void;               // Called when the user clicks the button
  isLoading: boolean;                 // Disables the form while processing
}

export default function UrlInput({ url, onChange, onSubmit, isLoading }: UrlInputProps) {
  // Handle form submission — prevents the default browser page-reload behavior
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || isLoading) return; // Guard: don't submit if empty or already running
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="youtube-url" className="text-sm font-medium text-gray-300">
        YouTube URL
      </label>

      <input
        id="youtube-url"
        type="url"
        value={url}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
        disabled={isLoading}
        className="
          w-full px-4 py-3 rounded-xl
          bg-gray-800 border border-gray-700
          text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition
        "
      />

      <button
        type="submit"
        disabled={!url.trim() || isLoading}
        className="
          w-full py-3 rounded-xl
          bg-indigo-600 hover:bg-indigo-500
          text-white font-semibold text-base
          transition
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {/* Show a spinner + different text while processing */}
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Processing…
          </span>
        ) : (
          "Find Viral Clips"
        )}
      </button>
    </form>
  );
}
