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
npm run test:e2e   # jest --config test/jest-e2e.json --runInBand
```

## Architecture

Standard NestJS module structure. Entry point: `src/main.ts` bootstraps a `NestFastifyApplication`.

**Module pattern:** every feature is a self-contained module (`*.module.ts`) that declares its controllers and providers. Import feature modules into `AppModule`.

**DI:** NestJS dependency injection is constructor-based. `emitDecoratorMetadata: true` is required in `tsconfig.json` — do not remove it.

**HTTP adapter:** Fastify is used instead of Express. Keep this in mind when working with request/response objects — use Fastify types, not Express types.

## Modules

### `PrismaModule`

Global database access module. Provides `PrismaService` (Prisma Client wrapper). Any module that needs DB access imports `PrismaModule`.

### `UsersModule`

Owns all user-related persistence. No HTTP controller — purely internal, consumed by `AuthModule` via CQRS bus.

| File                                     | Responsibility                                                        |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `commands/create-user.command.ts`        | Command: create a user by email + raw password                        |
| `queries/find-user-by-email.query.ts`    | Query: look up a user record by email                                 |
| `handlers/create-user.handler.ts`        | Hashes password, inserts row, throws `ConflictException` on duplicate |
| `handlers/find-user-by-email.handler.ts` | Returns `UserRecord \| null`                                          |

### `AuthModule`

Handles login/registration HTTP endpoints and JWT issuance. Delegates user persistence to `UsersModule` via CQRS bus.

| File                           | Responsibility                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `commands/register.command.ts` | Command: register with email + password                                              |
| `commands/login.command.ts`    | Command: login with email + password                                                 |
| `handlers/register.handler.ts` | Dispatches `CreateUserCommand`, signs JWT                                            |
| `handlers/login.handler.ts`    | Dispatches `FindUserByEmailQuery`, verifies password, signs JWT                      |
| `guards/jwt.guard.ts`          | Validates `Authorization: Bearer` header, attaches `{ id, email }` to `request.user` |
| `dto/register.dto.ts`          | Validation DTO for POST /auth/register                                               |
| `dto/login.dto.ts`             | Validation DTO for POST /auth/login                                                  |

### `MeetingModule`

CRUD for meetings. Protected by `JwtGuard`.

| File                                 | Responsibility                        |
| ------------------------------------ | ------------------------------------- |
| `commands/create-meeting.command.ts` | Command: create a meeting             |
| `queries/get-meeting.query.ts`       | Query: get one meeting by id          |
| `queries/get-meetings.query.ts`      | Query: list all meetings for an owner |
| `handlers/create-meeting.handler.ts` | Inserts meeting row                   |
| `handlers/get-meeting.handler.ts`    | Returns single meeting                |
| `handlers/get-meetings.handler.ts`   | Returns list of meetings              |

## CQRS

All features use `@nestjs/cqrs`. The pattern is split by intent: writes go through `CommandBus`, reads through `QueryBus`.

### File layout per feature

```
src/<feature>/
  commands/         # one file per command class
  queries/          # one file per query class
  handlers/         # one handler per command/query
  dto/              # validation DTOs (class-validator)
  <feature>.controller.ts   # only if the module has HTTP endpoints
  <feature>.module.ts
```

### Commands (writes)

```ts
// 1. Plain class — carries the data
export class CreateMeetingCommand {
  constructor(
    public readonly ownerId: string,
    public readonly title: string,
  ) {}
}

// 2. Handler — annotated, registered as provider in the module
@CommandHandler(CreateMeetingCommand)
export class CreateMeetingHandler implements ICommandHandler<CreateMeetingCommand> {
  async execute(command: CreateMeetingCommand) { ... }
}

// 3. Controller or another handler dispatches via CommandBus
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

### Cross-module communication via CQRS

Modules communicate exclusively through the CQRS bus — never by importing each other's services directly. Example: `AuthModule` dispatches `CreateUserCommand` and `FindUserByEmailQuery`; `UsersModule` registers their handlers. Both modules import `CqrsModule`, which provides a shared application-level bus.

### Module wiring

Every feature module must import `CqrsModule` and list all handlers in `providers`:

```ts
@Module({
  imports: [CqrsModule, ...],
  controllers: [FeatureController],
  providers: [HandlerA, HandlerB],
})
export class FeatureModule {}
```

### Auth guard

Protected routes use `JwtGuard` (`src/auth/guards/jwt.guard.ts`). It validates the `Authorization: Bearer <token>` header and attaches `{ id, email }` to `request.user`. Apply at controller level with `@UseGuards(JwtGuard)`. The guard requires `JwtModule` to be available in the module where it is used — import `AuthModule` or re-provide `JwtModule` locally.

## Testing

### Overview

All tests are e2e — there are no unit tests. Tests boot the full NestJS application against a real PostgreSQL database and send HTTP requests via `supertest`.

### Running tests

```bash
# from apps/api
npm run test:e2e

# from monorepo root
cd apps/api && npm run test:e2e
```

`--runInBand` is set in the script, so suites run sequentially (no parallel workers). This is required because all tests share one database and the cleanup in `beforeAll`/`afterAll` must not race.

### Prerequisites

A running PostgreSQL instance reachable at the `DATABASE_URL` in `.env`. The same database is used for development and tests — tests clean up after themselves via `prisma.<table>.deleteMany()` in `beforeAll` and `afterAll`.

Required `.env` variables:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/video_meetings?schema=public"
JWT_SECRET="..."
```

### Test files

| File                       | Covers                                              |
| -------------------------- | --------------------------------------------------- |
| `test/auth.e2e-spec.ts`    | `POST /auth/register`, `POST /auth/login`           |
| `test/meeting.e2e-spec.ts` | `POST /meeting`, `GET /meeting`, `GET /meeting/:id` |

### Writing new tests

- Place test files in `test/` with the `.e2e-spec.ts` suffix.
- Bootstrap the app with `FastifyAdapter` and call `app.getHttpAdapter().getInstance().ready()` before making requests.
- Enable `ValidationPipe({ whitelist: true })` globally to match production behaviour.
- Clean up test data in `beforeAll` and `afterAll` using `PrismaService` obtained via `app.get(PrismaService)`.

## Key files

- `src/main.ts` — bootstrap, Fastify adapter, global port config
- `src/app.module.ts` — root module, imports all feature modules
- `nest-cli.json` — NestJS CLI config (`deleteOutDir: true` clears `dist/` on each build)
- `test/jest-e2e.json` — Jest config for e2e tests
