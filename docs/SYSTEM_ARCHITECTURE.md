# Apyclipy System Architecture

## 🏗️ Architecture Overview

Apyclipy is a high-performance automated video clipping and highlight generation platform built with Python (FastAPI + Celery) and React (TypeScript + Ant Design + Tailwind CSS).

### System Components

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Frontend (React)│       │ Backend(FastAPI)│       │  File Storage   │
│                 │       │                 │       │                 │
│ - Studio UI     │◄─────►│ - REST API      │◄─────►│ - Source Media  │
│ - Live Progress │       │ - Ingestion     │       │ - Export Clips  │
│ - Video Preview │       │ - Pipelines     │       │ - Metadata JSON │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ Worker (Celery) │
                          │                 │
                          │ - Transcription │
                          │ - LLM Analysis  │
                          │ - Smart Cutting │
                          │ - FFmpeg Render │
                          └─────────────────┘
```

## Processing Pipeline

1. **Ingestion (`INGEST`)**: Accepts YouTube links or local video files. Supports selective time segment cropping to only process specified durations.
2. **Transcription (`SUBTITLE`)**: Transcribes audio using local Whisper/SenseVoice or cloud speech recognition APIs. Generates word-level timestamps.
3. **Analysis & Scoring (`ANALYZE`)**: LLM extracts structured outlines, builds timeline candidate blocks, and scores segments based on viral potential and narrative completeness.
4. **Locating Highlights (`HIGHLIGHT`)**: Clusters high-scoring moments, generates titles and hooks for each platform format.
5. **Video Export (`EXPORT`)**: Uses FFmpeg to perform frame-accurate stream extraction, speaker framing, and dynamic subtitle burning.
6. **Completion (`DONE`)**: Delivers clean, unbranded video clips and publish kits.
