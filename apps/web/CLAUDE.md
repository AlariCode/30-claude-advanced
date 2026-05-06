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
