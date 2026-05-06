# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Nest.js 11 backend for the video-meetings platform. Uses Fastify adapter instead of the default Express. Runs on port 3001.

## Commands

Run from `apps/api` or use `npm run dev:api` from the monorepo root.

```bash
npm run dev        # nest start --watch (file-watch + rebuild)
npm run build      # nest build → dist/
npm run start      # node dist/main (production)
npm run lint       # eslint src/ and test/
npm run typecheck  # tsc --noEmit
```

## Architecture

Standard NestJS module structure. Entry point: `src/main.ts` bootstraps a `NestFastifyApplication`.

**Module pattern:** every feature is a self-contained module (`*.module.ts`) that declares its controllers and providers. Import feature modules into `AppModule`.

**DI:** NestJS dependency injection is constructor-based. `emitDecoratorMetadata: true` is required in `tsconfig.json` — do not remove it.

**HTTP adapter:** Fastify is used instead of Express. Keep this in mind when working with request/response objects — use Fastify types, not Express types.

## Key files

- `src/main.ts` — bootstrap, Fastify adapter, global port config
- `src/app.module.ts` — root module, imports all feature modules
- `nest-cli.json` — NestJS CLI config (`deleteOutDir: true` clears `dist/` on each build)
