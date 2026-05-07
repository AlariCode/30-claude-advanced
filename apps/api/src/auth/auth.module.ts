import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { LoginHandler } from './handlers/login.handler'
import { RegisterHandler } from './handlers/register.handler'

@Module({
  imports: [
    CqrsModule,
    JwtModule.register({
      secret: process.env['JWT_SECRET'] ?? 'fallback-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [RegisterHandler, LoginHandler],
})
export class AuthModule {}
