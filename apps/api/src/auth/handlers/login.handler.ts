import { UnauthorizedException } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service'
import { LoginCommand } from '../commands/login.command'

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async execute(command: LoginCommand): Promise<{ token: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: command.email } })
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordMatch = await bcrypt.compare(command.password, user.password)
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials')
    }

    return { token: this.jwt.sign({ sub: user.id, email: user.email }) }
  }
}
