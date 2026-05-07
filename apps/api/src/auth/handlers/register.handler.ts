import { ConflictException } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service'
import { RegisterCommand } from '../commands/register.command'

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async execute(command: RegisterCommand): Promise<{ token: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: command.email } })
    if (existing) {
      throw new ConflictException('User with this email already exists')
    }

    const hashed = await bcrypt.hash(command.password, 10)
    const user = await this.prisma.user.create({
      data: { email: command.email, password: hashed },
    })

    return { token: this.jwt.sign({ sub: user.id, email: user.email }) }
  }
}
