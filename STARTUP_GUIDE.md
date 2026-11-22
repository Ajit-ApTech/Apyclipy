# Apyclipy Source Web Service Startup Guide

This guide covers running and developing Apyclipy directly from source on macOS/Linux. For containerized deployment, see [DOCKER.md](DOCKER.md). For desktop packaging, see [BUILD_GUIDE.md](BUILD_GUIDE.md).

## Prerequisites

- **Python 3.10+** (3.11 recommended)
- **Node.js 18+** & **npm**
- **Redis**
- **FFmpeg** & **ffprobe** in `PATH`

```bash
# Setup Python virtual environment
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt

# Setup Frontend dependencies
(cd frontend && npm ci)

# Setup Environment Configuration
cp env.example .env
```

Edit `.env` to configure your AI model keys and Redis connection.
On macOS, start Redis with: `brew install redis && brew services start redis`.
On Linux, use your distribution's service manager: `sudo systemctl start redis`.

## Service Management Scripts

```bash
./start_autoclip.sh             # Run in foreground (Ctrl+C stops all services)
./start_autoclip.sh --detach    # Run as a managed background process
./status_autoclip.sh            # Check status of running processes and health endpoints
./stop_autoclip.sh              # Stop running Apyclipy backend, frontend, and Celery workers
```

Default URLs:
- **Backend API**: `http://localhost:8000`
- **Web Frontend**: `http://localhost:3000`
- Override ports using `BACKEND_PORT` and `FRONTEND_PORT` environment variables.

Process IDs are stored in `backend.pid`, `frontend.pid`, and `celery.pid`. Logs are placed in `logs/`.

## Manual Development Mode

You can run each component in separate terminal windows:

```bash
# Terminal 1: FastAPI Backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Celery Worker
celery -A backend.core.celery_app worker --loglevel=info --concurrency=1 -Q celery,processing,video,notification,upload

# Terminal 3: Frontend Dev Server
(cd frontend && npm run dev -- --port 3000)
```
