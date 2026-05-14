# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Next.js 15 frontend for the video-meetings platform. Uses App Router with Turbopack in dev mode. Runs on port 3000.

## Commands

Run from `apps/web` or use `npm run dev:web` from the monorepo root.

```bash
npm run dev        # next dev --turbopack
npm run build      # next build
npm run start      # production server
npm run lint       # next lint
npm run lint:fix   # next lint --fix
npm run typecheck  # tsc --noEmit
```

## Architecture

Uses the **App Router** (`src/app/`). All routes, layouts, and pages live under `src/app/`. The `@/*` path alias resolves to `src/`.

Components default to **React Server Components** — add `'use client'` only when interactivity or browser APIs are needed.

## Key conventions

- `src/app/layout.tsx` — root layout; sets `<html lang="ru">` and global metadata
- `src/app/globals.css` — global reset only; component styles go alongside components
- No `src/pages/` directory — Pages Router is not used

## UI changes — Definition of Done

**Every UI change, no matter how small, MUST satisfy all of the following before the task is considered complete:**

1. **Visual test via Playwright MCP** — the dev server is already running, so use Playwright MCP tools (`mcp__playwright__browser_navigate`, `mcp__playwright__browser_take_screenshot`, `mcp__playwright__browser_snapshot`, etc.) directly to open the affected page, interact with it, and verify the change looks and behaves correctly. Do NOT start or restart the dev server.

2. **UX/UI review via `ui-ux-pro-max` skill** — invoke `/ui-ux-pro-max` (or call the skill programmatically) to review the changed components against UX best-practices (spacing, typography, colour contrast, interaction states, accessibility). Address any issues raised before marking the task done.

A task that touches the UI is **not complete** until both checks have been performed and any found issues resolved.

All screenshots save to /screenshot folder
