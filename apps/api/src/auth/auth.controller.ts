import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import { LoginCommand } from './commands/login.command'
import { RegisterCommand } from './commands/register.command'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<{ token: string }> {
    return this.commandBus.execute(new RegisterCommand(dto.email, dto.password))
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<{ token: string }> {
    return this.commandBus.execute(new LoginCommand(dto.email, dto.password))
  }
}
