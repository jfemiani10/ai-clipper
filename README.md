# AI Viral Moment Clipper

Paste a YouTube link. The app downloads the video, transcribes it with Whisper, asks Claude to find the most viral moments, and cuts those clips with ffmpeg — ready to preview and download.

## How it works

```
YouTube URL
    ↓ yt-dlp
video.mp4
    ↓ ffmpeg
audio.mp3
    ↓ Whisper (local, GPU-accelerated)
transcript with timestamps
    ↓ Claude claude-sonnet-4-6
viral moment timestamps (JSON)
    ↓ ffmpeg
clip_1.mp4, clip_2.mp4, ...
    ↓ Next.js streaming API
Browser video player + download
```

## Prerequisites

Install these before running the app.

### 1. Node.js 18+
```bash
node --version  # should print v18 or higher
```

### 2. yt-dlp
```bash
# Linux / WSL
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp
chmod +x ~/.local/bin/yt-dlp

# macOS
brew install yt-dlp
```

### 3. ffmpeg
```bash
# Linux / WSL (static build, no sudo needed)
curl -L https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz \
  | tar -xJ --strip-components=2 -C ~/.local/bin --wildcards '*/bin/ffmpeg' '*/bin/ffprobe'

# macOS
brew install ffmpeg
```

### 4. Whisper (local speech recognition)
```bash
pip install openai-whisper
# or on Ubuntu/Debian where pip is blocked:
pip install openai-whisper --user --break-system-packages
```

> **GPU acceleration (NVIDIA):** If you have an NVIDIA GPU, PyTorch will use it automatically. The `small` Whisper model runs ~8-10x faster on GPU than CPU.

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/yourname/ai-clipper.git
cd ai-clipper

# 2. Install dependencies
npm install

# 3. Set your API key
cp .env.example .env.local
# edit .env.local and add your Anthropic API key
# Get one at: https://console.anthropic.com/settings/keys

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Paste a YouTube URL
2. Click **Find Viral Clips**
3. Watch the progress steps update in real time
4. Preview the clips and download the ones you want

Processing takes 2–5 minutes depending on video length and your hardware.

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Main UI
│   ├── layout.tsx                  # Root HTML layout
│   └── api/
│       ├── process/route.ts        # POST — starts pipeline, returns jobId
│       ├── status/[jobId]/route.ts # GET  — poll job progress
│       └── clips/[filename]/route.ts # GET — stream clip file
├── components/
│   ├── UrlInput.tsx                # YouTube URL form
│   ├── ProcessingStatus.tsx        # Live step-by-step progress
│   └── ClipCard.tsx                # Video player + download button
└── lib/
    ├── types.ts                    # Shared TypeScript types
    ├── jobManager.ts               # In-memory job state
    ├── pipeline.ts                 # Orchestrates all steps
    ├── downloader.ts               # yt-dlp wrapper
    ├── transcriber.ts              # Whisper CLI wrapper
    ├── analyzer.ts                 # Claude API integration
    └── clipper.ts                  # ffmpeg wrapper
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API key from console.anthropic.com |

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | Next.js API Routes (Node.js) |
| Video download | yt-dlp |
| Audio extraction | ffmpeg |
| Transcription | OpenAI Whisper (local) |
| AI analysis | Claude claude-sonnet-4-6 |
| Clip cutting | ffmpeg |
