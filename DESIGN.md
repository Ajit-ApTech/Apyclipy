# Design System — Apyclipy

> The core visual and UI design principles for **Apyclipy**.
> Direction: **Calm Premium & Electric Obsidian**. Quiet, precise, generous whitespace, dark/light balance, and restrained indigo accents. Built for creators who care about high content quality.

## Product Context
- **What it is**: AI-powered video highlight extraction, smart framing, and clipping studio. Paste video URLs or upload local media -> automatically generate ready-to-publish short clips and compilations.
- **Audience**: Video creators, podcasters, stream clippers, video editors, and social media managers.
- **Tech Stack**: React 18, TypeScript, Tailwind CSS, Ant Design 5, Vite, FastAPI backend.
- **Brand Signature**: Clean, focused, reliable, and premium.

## Aesthetic Direction
- **Atmosphere**: Calm Obsidian / Modern Editorial.
- **Decoration Level**: Minimalist. Layout, typography, borders, and whitespace do the heavy lifting without excessive gimmicks.
- **Restraint**: Avoid clashing neons, crowded badge grids, or low-contrast pitch blacks.

## Color Tokens

### Dark Mode (Electric Obsidian)
```css
--bg:        #0B0D13;  /* Deep Obsidian background */
--card:      #131722;  /* Elevated card background */
--ink:       #F1F5F9;  /* Primary typography */
--sub:       #94A3B8;  /* Secondary / subtitle text */
--muted:     #64748B;  /* De-emphasized labels and placeholders */
--line:      #1E2433;  /* Clean hairline borders */
--line-2:    #262F42;  /* Subtle divider */
--accent:    #818CF8;  /* Indigo primary accent */
--cta-bg:    #6366F1;  /* Primary action background */
--cta-fg:    #FFFFFF;  /* Primary action text */
```

### Light Mode (Clean Slate)
```css
--bg:        #F8FAFC;  /* Slate-50 soft background */
--card:      #FFFFFF;  /* Card surface */
--ink:       #0F172A;  /* Slate-900 sharp text */
--sub:       #475569;  /* Slate-600 secondary text */
--muted:     #94A3B8;  /* Slate-400 muted text */
--line:      #E2E8F0;  /* Slate-200 border */
--line-2:    #F1F5F9;  /* Divider */
--accent:    #6366F1;  /* Indigo accent */
--cta-bg:    #0F172A;  /* Solid ink button */
--cta-fg:    #FFFFFF;  /* White text */
```

## Typography & Hierarchy
- Headings: Clean sans-serif with subtle tracking.
- Numerics / Timers / Codes: Fixed-width tabular mono (`JetBrains Mono`, `SF Mono`, `ui-monospace`).
- Interactive States: Smooth transition timings (`150ms ease-in-out`), subtle scale hover, and glowing focus rings.
