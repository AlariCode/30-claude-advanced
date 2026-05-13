import { ConflictException } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateUserCommand } from '../commands/create-user.command'

export interface CreatedUser {
  id: string
  email: string
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateUserCommand): Promise<CreatedUser> {
    const existing = await this.prisma.user.findUnique({ where: { email: command.email } })
    if (existing) {
      throw new ConflictException('User with this email already exists')
    }

    const hashed = await bcrypt.hash(command.password, 10)
    const user = await this.prisma.user.create({
      data: { email: command.email, password: hashed },
    })

    return { id: user.id, email: user.email }
  }
}
