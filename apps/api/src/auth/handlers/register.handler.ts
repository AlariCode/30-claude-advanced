import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { JwtService } from '@nestjs/jwt'
import { CreateUserCommand } from '../../users/commands/create-user.command'
import { CreatedUser } from '../../users/handlers/create-user.handler'
import { RegisterCommand } from '../commands/register.command'

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly jwt: JwtService,
  ) {}

  async execute(command: RegisterCommand): Promise<{ token: string }> {
    const user = await this.commandBus.execute<CreateUserCommand, CreatedUser>(
      new CreateUserCommand(command.email, command.password),
    )

    return { token: this.jwt.sign({ sub: user.id, email: user.email }) }
  }
}
