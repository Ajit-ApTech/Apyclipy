# Changelog

All notable changes to the **Apyclipy** project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-22

### Enhanced
- **Rebranding to Apyclipy**: Modernized visual design, updated header wordmark, metadata, and asset naming.
- **100% English UI Localization**: Completely converted user-facing copy, readiness lines, error messages, and background streaming updates to English.
- **Selective Segment Cropping**: Added timecode range controls (`start_time` - `end_time`) to selectively process highlights from long 1–4 hour videos in minutes.
- **Target Clip Volume**: Added configuration to select target clip volume (Auto 4–6 clips based on content density, or specify 1 to 10 clips).
- **Processing Quality Selector**: Added switch between 720p HD (High Speed) and 1080p Full HD.
- **Watermark-Free Rendering**: Removed all forced outro cards, watermarks, and appended branding logos.
- **Real-Time Live Progress Feedback**: Visual 3-stage progress bar with real-time model streaming status, byte indicators, and dynamic elapsed / ETA timers.
- **Modern Electric Obsidian Theme**: Designed sleek dark/light palette with Obsidian and Royal Indigo accents and responsive Bento Grid cards.

## [1.5.0] - Earlier Releases

### Added
- Multi-platform template rendering for YouTube Shorts, TikTok, Instagram Reels, and YouTube Video.
- Speaker framing with facial tracking and active speaker detection.
- Fast one-pass outline and timeline extraction pipeline.
- Flexible model backend support (OpenAI, Anthropic, Gemini, DeepSeek, Ollama, LM Studio).
