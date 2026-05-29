import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import { FastifyReply } from 'fastify'
import { LoginCommand } from './commands/login.command'
import { RegisterCommand } from './commands/register.command'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

function buildCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ token: string }> {
    const result = await this.commandBus.execute<RegisterCommand, { token: string }>(
      new RegisterCommand(dto.email, dto.password),
    )
    res.setCookie('vm_token', result.token, buildCookieOptions(COOKIE_MAX_AGE_SECONDS))
    return result
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ token: string }> {
    const result = await this.commandBus.execute<LoginCommand, { token: string }>(
      new LoginCommand(dto.email, dto.password),
    )
    res.setCookie('vm_token', result.token, buildCookieOptions(COOKIE_MAX_AGE_SECONDS))
    return result
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: FastifyReply): void {
    res.clearCookie('vm_token', { path: '/' })
  }
}
