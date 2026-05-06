# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Structure

npm workspaces monorepo with two apps and a shared packages directory:

- `apps/web` — Next.js 15 frontend (`@video-meetings/web`)
- `apps/api` — Nest.js 11 backend (`@video-meetings/api`)
- `packages/` — shared packages (empty, reserved for future use)

All `node_modules` are hoisted to the root. Install dependencies with `npm install` from the root.

## Commands

Run from the **root** unless noted otherwise.

```bash
# Development
npm run dev          # both apps simultaneously (concurrently)
npm run dev:web      # Next.js only  (port 3000)
npm run dev:api      # Nest.js only  (port 3001)

# Build
npm run build        # both apps sequentially
npm run build:web
npm run build:api

# Lint & format
npm run lint         # ESLint across all workspaces
npm run lint:fix     # auto-fix
npm run format       # Prettier write
npm run format:check # Prettier check (CI)

# Type checking
npm run typecheck    # tsc --noEmit across all workspaces
```

## TypeScript

`tsconfig.base.json` at root defines shared compiler options (`strict: true`, `ES2022` target). Each app extends it and overrides what's needed:

- `apps/web` — overrides to `moduleResolution: bundler`, adds `jsx: preserve` and path alias `@/*` → `src/*`
- `apps/api` — overrides to `module: CommonJS`, enables `emitDecoratorMetadata` and `experimentalDecorators` (required by NestJS DI)

## Code style

Prettier is the source of truth for formatting; ESLint does not enforce style (eslint-config-prettier disables conflicting rules).

Key Prettier settings: no semicolons, single quotes, trailing commas everywhere, 100-char print width.

ESLint uses flat config (`eslint.config.mjs`). Root config applies to the whole monorepo; `apps/web` has its own config extending `next/core-web-vitals`.

Unused variables prefixed with `_` are allowed by ESLint (`argsIgnorePattern: '^_'`).

## Keeping documentation current

When making architectural changes, update the relevant CLAUDE.md **in the same commit**:

- Added or removed an app/package → update the root `CLAUDE.md` (Structure section)
- Changed ports, bootstrap logic, or HTTP adapter in `apps/api` → update `apps/api/CLAUDE.md`
- Changed routing strategy, RSC boundaries, or path aliases in `apps/web` → update `apps/web/CLAUDE.md`
- Changed shared TypeScript config, ESLint rules, or Prettier settings → update the root `CLAUDE.md`

Each app's `CLAUDE.md` covers only that app. Cross-cutting concerns (workspaces, shared tooling, monorepo scripts) belong in the root file.
