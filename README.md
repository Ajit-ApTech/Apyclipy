<div align="center">

# ✦ Apyclipy

### AI-Powered Smart Video Clipping & Highlight Generation

**Paste a link or upload a video, choose your target platforms, and get ready-to-publish short clips with dynamic subtitles, smart framing, and auto-generated copy.**

[![GitHub Repo](https://img.shields.io/badge/GitHub-Ajit--ApTech%2FApyclipy-indigo?style=flat-square&logo=github)](https://github.com/Ajit-ApTech/Apyclipy)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://python.org)
[![React: 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)

[Features](#key-features) · [Quick Start](#quick-start) · [Docker Deployment](#docker-deployment) · [Configuration](#configuration) · [System Architecture](#system-architecture) · [License](#license)

</div>

---

## 🌟 Key Features

### 🎬 Smart Automated Clipping
* **Instant Ingestion**: Paste a YouTube video URL or drag-and-drop local video files (`.mp4`, `.mov`, `.mkv`).
* **AI Highlight Detection**: Advanced LLM-powered speech and visual analysis scores moments based on engagement, hook strength, completeness, and narrative value.
* **Smart Speaker Framing**: Automatically crops landscape footage to 9:16 vertical using face tracking and active-speaker detection, falling back gracefully to scenic preservation when no speaker is present.

### ⚡ Selective Time Range & Fast Processing
* **Selective Segment Cropping**: For long 1–4 hour podcasts or streams, specify an exact interval (e.g., `00:00:00` to `00:15:00`) to process only the most relevant moments without downloading or transcribing the entire video.
* **Quality & Speed Control**: Switch between **720p HD** (3–4x faster download and processing) and **1080p Full HD**.
* **Target Clip Count**: Set your desired clip volume (Auto 4–6 clips based on content, or specify exact target clip counts from 1 to 10).

### 📊 Real-Time Live Progress
* **Interactive Multi-Stage Progress**: Live 3-stage visual tracker:
  1. *Download & Transcribe* (yt-dlp, local Whisper / cloud ASR)
  2. *AI Analysis & Scoring* (Timeline extraction, topic clustering, and clip title generation)
  3. *Auto Editing & Video Render* (FFmpeg smart cutting, dynamic subtitle burn-in)
* **Real-time Live Pulse**: Live streaming status showing tokens received, download bytes, and dynamic elapsed / ETA timers.

### 🚫 100% Clean Exports (No Watermark)
* **Zero Appended Logos**: Clean video outputs without any forced end-cards, watermarks, or branding outros.
* **Auto-Generated Copy**: Includes ready-to-use title proposals, descriptions, and hashtags tailored for social distribution.

### 🎨 Modern Electric Obsidian UI
* **Refined Design System**: Obsidian and Royal Indigo palette with seamless Dark/Light mode support.
* **Bento Grid Controls**: Intuitive cards for platform selection, crop intervals, model preferences, and subtitle toggles.
* **100% English Interface**: Clean, accessible language throughout every screen and error state.

---

## 🚀 Quick Start

### Prerequisites
* **Python 3.10+** (3.11 recommended)
* **Node.js 18+** & **npm**
* **FFmpeg** & **ffprobe** installed and accessible in your system `PATH`
* **Redis** (used for background task queuing)

### 1. Clone the Repository
```bash
git clone https://github.com/Ajit-ApTech/Apyclipy.git
cd Apyclipy
```

### 2. Setup Backend Environment
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
```

### 3. Setup Frontend Environment
```bash
cd frontend
npm ci
cd ..
```

### 4. Configure Environment
Edit `.env` to configure your preferred AI model provider (OpenAI, Anthropic, Gemini, DeepSeek, or local Ollama/LM Studio):
```ini
LLM_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
API_MODEL_NAME=gpt-4o-mini
REDIS_URL=redis://localhost:6379/0
```

### 5. Launch Apyclipy
You can start the full stack using the automated launcher scripts:
```bash
# Foreground execution (interactive logs)
./start_autoclip.sh

# Or start as a detached background service
./start_autoclip.sh --detach

# Stop all running services
./stop_autoclip.sh
```

Once started:
* **Web UI**: [http://localhost:3000](http://localhost:3000)
* **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🐳 Docker Deployment

Apyclipy provides production-ready Docker Compose configurations for containerized setups.

```bash
# Copy sample configuration
cp env.example .env

# Create data directories
mkdir -p data logs uploads

# Build and start services
docker compose up -d --build
```

Access the web interface at `http://localhost:3000`.

---

## 🛠️ Supported Platforms & Formats

| Platform | Output Aspect | Recommended Duration | Preset Style |
| :--- | :---: | :---: | :--- |
| **YouTube Shorts** | 9:16 Vertical | 15s – 60s | Full-screen dynamic |
| **TikTok** | 9:16 Vertical | 15s – 90s | Dynamic speech captions |
| **Instagram Reels** | 9:16 Vertical | 15s – 90s | Clean center-focus |
| **YouTube Video** | 16:9 Landscape | 3m – 10m+ | Original high-definition |
| **Douyin / Bilibili** | 9:16 or 16:9 | Adaptive | Interview / presentation |

---

## 🔒 Privacy & Architecture

* **Local Compute First**: All video cuts, face detection, framing, and final FFmpeg rendering execute 100% locally on your computer.
* **Controlled Cloud Data Flow**: Only relevant transcript lines and metadata are sent to your chosen LLM endpoint for highlight extraction.
* **No Telemetry Leaks**: Third-party tracking and telemetry can be completely toggled off in Settings.

---

## 🤝 Contributing

Contributions, bug reports, and feature suggestions are welcome!
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
