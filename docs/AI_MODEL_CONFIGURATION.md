# AI Model Configuration Guide

In **Apyclipy**, configuring AI models is simple: select a provider in Settings -> AI Models, and enter your API Key. The provider list supports OpenAI, Anthropic, Gemini, DeepSeek, custom OpenAI-compatible endpoints, and local models (Ollama, LM Studio).

## Capabilities

- **Highlight Analysis**: Automatically selects the best recommended model once connected, with manual override available.
- **Vision Understanding**: Reuses the highlight model by default, or allows selecting an independent multimodal connection for frame analysis.
- **Speech Transcription**: Choose local Whisper / SenseVoice, or configure cloud transcription (e.g., Bailian, OpenAI Whisper API). Local transcription downloads components on-demand and runs entirely on your CPU/GPU without uploading audio.

## Local Models

For **Ollama**:
- Default Base URL: `http://localhost:11434/v1`
- Start Ollama and run your model (e.g., `ollama run llama3.2`). No API key needed.

For **LM Studio**:
- Default Base URL: `http://localhost:1234/v1`
- Start LM Studio Local Server. No API key needed.

## Configuration Persistence

Configurations are saved to `ai-model-settings.json` in the application data directory. Settings are loaded atomically and shared across the API server and worker processes.
