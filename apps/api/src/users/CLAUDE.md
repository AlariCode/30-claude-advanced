### `UsersModule`

Owns all user-related persistence and exposes `GET /users/me`, `PATCH /users/me`, `POST /users/me/avatar`, and `POST /users/me/change-password` HTTP endpoints protected by `JwtGuard`.

| File                                     | Responsibility                                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `commands/change-password.command.ts`    | Command: change password (carries userId, oldPassword, newPassword)                                                     |
| `commands/create-user.command.ts`        | Command: create a user by email + raw password                                                                          |
| `commands/update-profile.command.ts`     | Command: update name/avatarUrl for a user                                                                               |
| `commands/upload-avatar.command.ts`      | Command: upload avatar (carries userId, mimeType, fileStream)                                                           |
| `queries/find-user-by-email.query.ts`    | Query: look up a user record by email                                                                                   |
| `queries/get-me.query.ts`                | Query: get user profile by id                                                                                           |
| `handlers/change-password.handler.ts`    | Verifies old password via bcrypt, hashes new password, updates DB                                                       |
| `handlers/create-user.handler.ts`        | Hashes password, inserts row, throws `ConflictException` on duplicate                                                   |
| `handlers/find-user-by-email.handler.ts` | Returns `UserRecord \| null`                                                                                            |
| `handlers/get-me.handler.ts`             | Returns `UserProfile \| null` by userId                                                                                 |
| `handlers/update-profile.handler.ts`     | Updates name/avatarUrl, returns updated `UserProfile`                                                                   |
| `handlers/upload-avatar.handler.ts`      | Validates mime/size, saves to `uploads/avatars/`, updates DB, deletes old file                                          |
| `dto/change-password.dto.ts`             | Validation DTO for POST /users/me/change-password                                                                       |
| `dto/update-profile.dto.ts`              | Validation DTO for PATCH /users/me                                                                                      |
| `users.controller.ts`                    | `GET /users/me`, `PATCH /users/me`, `POST /users/me/avatar`, `POST /users/me/change-password` — JWT-protected endpoints |
| `types.ts`                               | Shared `UserProfile` interface                                                                                          |
