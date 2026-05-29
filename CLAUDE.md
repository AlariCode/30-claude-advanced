# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Обязательно для каждого метода сервиса

- Все параметры имеют явный TypeScript тип
- Возвращаемый тип указан явно через Promise<T>
- Нет console.log — используй Logger из @nestjs/common
- Переменные называй по смыслу — не x, не data, не result

## Перед написанием нового кода

- Прочитай CLAUDE.md правила, он имеет больший приоритет над существующим кодом
- Посмотри на соседние файлы которые написаны правильно

## Именование

- Файлы: feature.type.ts (meetings.service.ts)
- Методы описывают действие: createMeetingWithFiles
- Переменные по смыслу: meetingId не id, x, data
- Enum вместо строк: MeetingStatus.PENDING не 'pnd'
- Константы вместо magic numbers: MAX_FILE_SIZE_MB

## Размер

- Файл > 250 строк → декомпозируй перед добавлением кода
- Метод > 40 строк → выдели в приватный метод
- Вложенность > 3 уровней → рефакторить

## Рефакторинг

- Перед добавлением кода в большой файл — декомпозируй
- Тесты зелёные на каждом шаге рефакторинга

## Structure

npm workspaces monorepo with two apps and a shared packages directory:

- `apps/web` — Next.js 15 frontend (`@video-meetings/web`)
- `apps/api` — Nest.js 11 backend (`@video-meetings/api`)
- `packages/` — shared packages (empty, reserved for future use)

Install dependencies with `npm install` from the root.

## Commands

See `package.json` scripts. Run all commands from the **root**.

## TypeScript

`tsconfig.base.json` at root defines shared compiler options (`strict: true`, `ES2022` target). Each app extends it and overrides what's needed.

## Code style

Prettier is the source of truth for formatting; ESLint does not enforce style (eslint-config-prettier disables conflicting rules).

Key Prettier settings: no semicolons, single quotes, trailing commas everywhere, 100-char print width.

ESLint uses flat config (`eslint.config.mjs`). Root config applies to the whole monorepo; `apps/web` has its own config extending `next/core-web-vitals`.

Unused variables prefixed with `_` are allowed by ESLint (`argsIgnorePattern: '^_'`).

## Token efficiency

- `git diff` всегда с `--unified=0`
- `git log` всегда с `--oneline -10`
- `gh issue list` всегда с `--json number,title`
- `npm run test` всегда с `--silent`
- `npx tsc --noEmit` всегда с `2>&1 | tail -5`

## App-level docs

- [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) — NestJS app (ports, bootstrap, HTTP adapter)
- [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) — Next.js app (routing, RSC boundaries, path aliases)

## Keeping documentation current

When making architectural changes, update the CLAUDE.md of the affected scope in the same commit. Each app's `CLAUDE.md` covers only that app; cross-cutting concerns belong in the root file.
