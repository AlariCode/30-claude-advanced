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

## CQRS

All features use `@nestjs/cqrs`. The pattern is split by intent: writes go through `CommandBus`, reads through `QueryBus`.

### File layout per feature

```
src/<feature>/
  commands/         # one file per command class
  queries/          # one file per query class
  handlers/         # one handler per command/query
  dto/              # validation DTOs (class-validator)
  <feature>.controller.ts
  <feature>.module.ts
```

### Commands (writes)

```ts
// 1. Plain class — carries the data
export class CreateMeetingCommand {
  constructor(
    public readonly ownerId: string,
    public readonly title: string,
    // ...
  ) {}
}

// 2. Handler — annotated, registered as provider in the module
@CommandHandler(CreateMeetingCommand)
export class CreateMeetingHandler implements ICommandHandler<CreateMeetingCommand> {
  async execute(command: CreateMeetingCommand) { ... }
}

// 3. Controller dispatches via CommandBus
this.commandBus.execute(new CreateMeetingCommand(...))
```

### Queries (reads)

Same shape, different base types:

```ts
export class GetMeetingsQuery {
  constructor(public readonly ownerId: string) {}
}

@QueryHandler(GetMeetingsQuery)
export class GetMeetingsHandler implements IQueryHandler<GetMeetingsQuery> {
  async execute(query: GetMeetingsQuery) { ... }
}

this.queryBus.execute(new GetMeetingsQuery(userId))
```

### Module wiring

Every feature module must import `CqrsModule` and list all handlers in `providers`:

```ts
@Module({
  imports: [CqrsModule, ...],
  controllers: [MeetingController],
  providers: [CreateMeetingHandler, GetMeetingsHandler, GetMeetingHandler],
})
export class MeetingModule {}
```

### Auth guard

Protected routes use `JwtGuard` (`src/auth/guards/jwt.guard.ts`). It validates the `Authorization: Bearer <token>` header and attaches `{ id, email }` to `request.user`. Apply at controller level with `@UseGuards(JwtGuard)`. The guard requires `JwtModule` and `JwtGuard` to be registered in the feature module's `providers`.

## Key files

- `src/main.ts` — bootstrap, Fastify adapter, global port config
- `src/app.module.ts` — root module, imports all feature modules
- `nest-cli.json` — NestJS CLI config (`deleteOutDir: true` clears `dist/` on each build)
