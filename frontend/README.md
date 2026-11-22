# Apyclipy Frontend

Web application for **Apyclipy** built with React, TypeScript, Vite, Ant Design, and Tailwind CSS.

## Features

### 🎯 Core Capabilities
- **Video Ingestion**: Drag-and-drop local video files (`.mp4`, `.mov`, `.mkv`) and subtitle files (`.srt`), or paste online video URLs.
- **Smart Clip Generation**: AI-powered highlight extraction and scoring.
- **Selective Segment Crop**: Crop specific time ranges (e.g., `00:00:00` - `00:15:00`) for rapid processing of long videos.
- **Target Clip Count**: Customize the number of generated clips (Auto 4–6, or 1 to 10 clips).
- **Processing Quality**: Choose between 720p HD (High Speed) and 1080p Full HD.
- **Live Progress Monitor**: Real-time 3-stage progress with streaming token counts and dynamic ETAs.
- **Watermark-Free Export**: Clean video outputs without appended branding logos or end-cards.

### 🎨 User Interface & Design
- **Modern Obsidian & Indigo Theme**: Polished dark and light themes with fluid transitions.
- **Bento Grid Layout**: Structured cards for preferences, models, and platform targets.
- **Responsive Layout**: Designed for desktop and mobile viewports.
- **100% English**: Clean and accessible typography throughout.

## Technology Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Components**: Ant Design 5 + Custom headless components
- **Styling**: Tailwind CSS + Custom CSS Design Tokens
- **Icons**: Ant Design Icons + Lucide Icons
- **State Management**: Zustand
- **Internationalization**: i18next

## Getting Started

### Development
```bash
# Install dependencies
npm ci

# Start development server
npm run dev
```

### Production Build
```bash
# Type check and build bundle
npm run build

# Preview production build locally
npm run preview
```
