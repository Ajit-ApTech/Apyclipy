# Apyclipy Product Roadmap

Apyclipy evolves from a local video clipping tool into a powerful, automated creator studio for multi-platform short video generation.

## Core Architectural Principles

| Dimension | Strategy | Implementation |
| :--- | :--- | :--- |
| **Processing Location** | Local Compute First | Downloads, FFmpeg cutting, Whisper speech recognition, and face tracking run on user hardware. |
| **AI Intelligence** | Hybrid LLM Integration | Support for both cloud endpoints (OpenAI, Gemini, Anthropic, DeepSeek) and local inference (Ollama, LM Studio). |
| **User Experience** | Frictionless & Watermark-Free | Clean, unbranded exports ready for immediate publishing with customizable crop segments and target clip volumes. |

## Feature Milestones

### Phase 1: Core Clipping & Pipeline Stability (Completed)
- [x] Automated video ingestion from YouTube and local MP4/MOV files.
- [x] Speech transcription with local Whisper and cloud providers.
- [x] AI analysis for highlight scoring, narrative hooks, and title generation.
- [x] Speaker tracking and adaptive 9:16 vertical crop.
- [x] Multi-platform template export (Shorts, TikTok, Reels, YouTube).
- [x] Selective time-segment cropping (`00:00:00` - `00:15:00`).
- [x] Target clip count controls (1 to 10 clips).
- [x] Processing quality selection (720p High Speed / 1080p Full HD).
- [x] Real-time live progress feedback with streaming stats and elapsed timers.
- [x] Modern Electric Obsidian & Royal Indigo UI theme.
- [x] 100% English interface localization and removal of all ending watermarks.

### Phase 2: Advanced Editing & Multimodal Enhancement (Ongoing)
- [ ] Multimodal vision-based keyframe scoring for gameplay and low-dialogue videos.
- [ ] In-browser timeline fine-tuning with waveform visualization.
- [ ] Dynamic kinetic typography and auto-highlighted subtitle keywords.
- [ ] Direct publishing integrations via platform APIs.
- [ ] Preset style packs for podcast, gaming, tutorials, and lifestyle creators.
