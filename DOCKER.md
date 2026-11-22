# Docker Deployment Guide for Apyclipy

This guide covers running Apyclipy using Docker and Docker Compose on Linux, macOS, Windows, or cloud servers.

## Requirements

- **Docker** 20.10+
- **Docker Compose v2** (`docker compose`)

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Ajit-ApTech/Apyclipy.git
cd Apyclipy
```

### 2. Configure Environment Variables
```bash
cp env.example .env
```
Edit `.env` to set your desired `LLM_PROVIDER`, API keys, and model configuration.

### 3. Create Storage Directories
```bash
mkdir -p data logs uploads
```

On Linux hosts, ensure proper file permissions:
```bash
docker compose run --rm --no-deps --user root --entrypoint sh autoclip -c 'chown -R autoclip:autoclip /app/data /app/logs /app/uploads'
```

### 4. Build and Start Containers
```bash
docker compose up -d --build
```

### 5. Access the Application
- **Web UI**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs`

To view logs:
```bash
docker compose logs -f
```

To stop containers:
```bash
docker compose down
```
