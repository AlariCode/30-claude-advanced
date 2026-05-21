import { BadRequestException, NotFoundException } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service'
import { ChangePasswordCommand } from '../commands/change-password.command'

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const { userId, oldPassword, newPassword } = command

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    })

    if (!user) throw new NotFoundException('User not found')

    const isValid = await bcrypt.compare(oldPassword, user.password)
    if (!isValid) throw new BadRequestException('Old password is incorrect')

    const hashed = await bcrypt.hash(newPassword, 10)
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    })
  }
}
