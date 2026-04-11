# CLAUDE.md

## Design Context

### Project Overview

A Chrome extension popup (600×600px) for tracking video watching history across streaming sites (bilibili, iyf.tv, zxzjhd.com). Core job: quickly see what you've watched and jump back in.

### Tech Stack

- React + TypeScript + Tailwind CSS (default config, no custom tokens yet)
- Chrome Extension popup — fixed 600×600px viewport
- Light/dark mode toggle (both equally important)
- No custom design library; all styles via Tailwind utility classes

### Users

Self-use power user who may share with friends. Opens the popup while watching to recall progress, then clicks to resume. Short, goal-oriented sessions — no browsing, no discovery.

### Brand Personality

**Simple · Efficient · Restrained**

### Aesthetic Direction

Reference: **Linear** — precision, depth without darkness, restrained color, strong typographic hierarchy. Feels like a well-made developer tool.

Anti-references: neon gradients, heavy imagery, playful fonts, accent overuse.

Both light and dark modes are first-class citizens. Dark = focused cinema feel. Light = clean reading feel.

### Design Principles

1. **Information density over decoration** — pack meaningful signal per pixel; suppress noise.
2. **Typographic hierarchy carries the UI** — size, weight, and opacity do the heavy lifting.
3. **Restrained accent** — blue is reserved for links and primary actions only.
4. **Depth through layering** — use subtle background stacking (3-4 levels) rather than borders or shadows.
5. **Both modes feel intentional** — each mode has its own atmosphere, not just color-invert.
